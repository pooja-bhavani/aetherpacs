import os
import io
import json
import asyncio
import boto3
import psycopg2
import uuid
import numpy as np
import pydicom
from pydicom.errors import InvalidDicomError
from PIL import Image
from botocore.client import Config
from nats.aio.client import Client as NATS

print("🧠 Pre-loading clinical Python worker environment...")

# Initialize S3 connections over private network
s3 = boto3.client(
    's3',
    endpoint_url=os.getenv("S3_ENDPOINT"),
    aws_access_key_id=os.getenv("S3_ACCESS_KEY"),
    aws_secret_access_key=os.getenv("S3_SECRET_KEY"),
    config=Config(s3={'addressing_style': 'path'}),
    region_name='us-east-1'
)

def init_s3():
    bucket_name = os.getenv("S3_BUCKET", "aetherpacs-files")
    try:
        s3.create_bucket(Bucket=bucket_name)
        print(f"✅ S3 Storage Bucket '{bucket_name}' initialized.")
    except Exception as e:
        print(f"ℹ️ Storage Bucket state verified: {e}")

init_s3()

def get_db_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        database=os.getenv("DB_NAME", "db"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        port=5432
    )

def dicom_str(ds, keyword, default=''):
    value = getattr(ds, keyword, None)
    if value is None:
        return default
    return str(value).replace('^', ' ').strip() or default

def normalize_to_uint8(arr):
    """Min-max normalize a raw pixel array to 0-255 uint8 (used when there's no DICOM window info)."""
    arr = arr.astype(np.float64)
    arr -= arr.min()
    max_val = arr.max()
    if max_val > 0:
        arr = arr / max_val * 255.0
    return arr.astype(np.uint8)

def apply_dicom_windowing(arr, ds):
    """Apply RescaleSlope/Intercept and WindowCenter/WindowWidth if present, else min-max normalize."""
    arr = arr.astype(np.float64)

    slope = float(getattr(ds, 'RescaleSlope', 1) or 1)
    intercept = float(getattr(ds, 'RescaleIntercept', 0) or 0)
    arr = arr * slope + intercept

    center = getattr(ds, 'WindowCenter', None)
    width = getattr(ds, 'WindowWidth', None)

    def first(v):
        if hasattr(v, '__iter__') and not isinstance(v, (str, bytes)):
            return float(list(v)[0])
        return float(v)

    if center is not None and width is not None:
        try:
            c, w = first(center), first(width)
            low, high = c - w / 2, c + w / 2
            arr = np.clip(arr, low, high)
        except (TypeError, ValueError):
            pass

    arr -= arr.min()
    max_val = arr.max()
    if max_val > 0:
        arr = arr / max_val * 255.0
    return arr.astype(np.uint8)

def render_preview_png(ds):
    """Decode real DICOM pixel data into a viewable PNG, or return None if there's nothing to render."""
    if 'PixelData' not in ds:
        return None

    arr = ds.pixel_array
    samples_per_pixel = int(getattr(ds, 'SamplesPerPixel', 1) or 1)

    # Multi-frame: preview the first frame only
    if arr.ndim == 4:
        arr = arr[0]
    elif arr.ndim == 3 and samples_per_pixel == 1:
        arr = arr[0]

    if samples_per_pixel == 1:
        rendered = apply_dicom_windowing(arr, ds)
        if str(getattr(ds, 'PhotometricInterpretation', '')) == 'MONOCHROME1':
            rendered = 255 - rendered
        img = Image.fromarray(rendered, mode='L')
    else:
        rendered = arr
        if rendered.dtype != np.uint8:
            rendered = normalize_to_uint8(rendered)
        img = Image.fromarray(rendered, mode='RGB')

    buf = io.BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    return buf

# DICOM Ingestion and Metadata Extraction pipeline — real pydicom parsing, no simulation
async def process_dicom(msg):
    data = json.loads(msg.data.decode())
    storage_key = data['storageKey']
    originalname = data['originalname']

    print(f"📥 Received DICOM file ingestion task: {originalname}")
    local_path = f"/tmp/{uuid.uuid4()}.dcm"
    conn = None

    try:
        # 1. Download raw file from private S3 bucket
        s3.download_file(
            os.getenv("S3_BUCKET", "aetherpacs-files"),
            storage_key,
            local_path
        )
        print(f"🏥 Raw DICOM downloaded to local sandbox.")

        # 2. Real DICOM header parsing
        ds = pydicom.dcmread(local_path)

        patient_id = dicom_str(ds, 'PatientID') or f"PAT-{uuid.uuid4().hex[:5].upper()}"
        patient_name = dicom_str(ds, 'PatientName') or originalname.rsplit('.', 1)[0]
        gender_raw = dicom_str(ds, 'PatientSex').upper()
        gender = gender_raw if gender_raw in ('M', 'F', 'O') else 'O'
        dob_raw = dicom_str(ds, 'PatientBirthDate')
        dob = f"{dob_raw[0:4]}-{dob_raw[4:6]}-{dob_raw[6:8]}" if len(dob_raw) == 8 else None

        study_uid = dicom_str(ds, 'StudyInstanceUID') or f"1.2.840.113619.2.135.{uuid.uuid4().hex[:12]}"
        modality = dicom_str(ds, 'Modality') or 'OT'
        study_description = dicom_str(ds, 'StudyDescription') or f"Uploaded Study — {originalname}"
        slice_count = int(getattr(ds, 'NumberOfFrames', 1) or 1)

        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            INSERT INTO patients (patient_id, patient_name, gender, dob)
            VALUES (%s, %s, %s, COALESCE(%s, '1900-01-01')::date)
            ON CONFLICT (patient_id) DO NOTHING;
        """, (patient_id, patient_name, gender, dob))

        cur.execute("""
            INSERT INTO studies (study_uid, patient_id, modality, study_description, study_date, slice_count)
            VALUES (%s, %s, %s, %s, NOW(), %s)
            ON CONFLICT (study_uid) DO NOTHING;
        """, (study_uid, patient_id, modality, study_description, slice_count))

        # 3. Real DICOM tags — every element actually present in the file, not a fixed set
        tag_rows = []
        for elem in ds:
            if elem.tag == 0x7FE00010:  # PixelData — binary, not a display tag
                continue
            try:
                tag_key = f"{elem.tag.group:04X},{elem.tag.element:04X}"
                tag_name = elem.keyword or elem.name or 'Unknown'
                tag_value = str(elem.value)[:500]
            except Exception:
                continue
            tag_rows.append((study_uid, tag_key, tag_name, tag_value))

        for tag in tag_rows:
            cur.execute("""
                INSERT INTO dicom_tags (study_uid, tag_key, tag_name, tag_value)
                VALUES (%s, %s, %s, %s);
            """, tag)

        # 4. Real pixel data → PNG preview, uploaded to S3, referenced on the study row.
        #    Rendering failures (e.g. unsupported compression codec) don't lose the metadata.
        try:
            png_buf = render_preview_png(ds)
            if png_buf is not None:
                preview_key = storage_key.rsplit('.', 1)[0] + '-preview.png'
                s3.upload_fileobj(
                    png_buf,
                    os.getenv("S3_BUCKET", "aetherpacs-files"),
                    preview_key,
                    ExtraArgs={'ContentType': 'image/png'}
                )
                cur.execute("UPDATE studies SET preview_key = %s WHERE study_uid = %s;", (preview_key, study_uid))
                print(f"🖼️  Rendered real pixel preview → {preview_key}")
            else:
                print("ℹ️ No pixel data in file — metadata-only study.")
        except Exception as render_err:
            print(f"⚠️ Pixel rendering skipped ({render_err}) — metadata still saved.")

        conn.commit()
        cur.close()
        conn.close()
        print(f"✅ Real DICOM metadata indexed to PostgreSQL for {patient_name} ({len(tag_rows)} tags).")

    except InvalidDicomError:
        print(f"❌ Rejected {originalname}: not a valid DICOM file (failed pydicom parse).")
        if conn is not None:
            conn.rollback()
    except Exception as e:
        print(f"❌ DICOM clinical parsing failure: {e}")
        if conn is not None:
            conn.rollback()
    finally:
        if conn is not None:
            conn.close()
        if os.path.exists(local_path):
            os.remove(local_path)

async def main():
    nc = NATS()
    print("📡 Worker connecting to NATS queue cluster...")
    try:
        await asyncio.wait_for(
            nc.connect(
                servers=[os.getenv("NATS_URL", "nats://queue:4222")],
                user=os.getenv("NATS_USER"),
                password=os.getenv("NATS_PASS"),
            ),
            timeout=15,
        )
    except asyncio.TimeoutError:
        print("❌ NATS connect() timed out after 15s — check NATS_URL/NATS_USER/NATS_PASS.")
        raise
    print("✅ Connected to NATS queue.")

    # Subscribe to DICOM processing task pipeline
    await nc.subscribe("dicom.parse", cb=process_dicom, queue="dicom_parsers")
    print("📡 Subscribed to dicom.parse — waiting for ingestion jobs.")

    while True:
        await asyncio.sleep(1)

if __name__ == "__main__":
    asyncio.run(main())
