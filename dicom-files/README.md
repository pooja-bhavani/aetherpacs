# DICOM files

Three valid DICOM (`.dcm`) files for exercising AetherPACS's upload pipeline end to
end — useful if you don't have a DICOM file on hand to try the "Upload DICOM Binary"
feature with.

| File | Modality | Patient | Study |
|---|---|---|---|
| `ct-abdomen.dcm` | CT | Marcus Whitfield (PAT-11024) | CT Abdomen & Pelvis - Portal Venous Phase |
| `mr-brain.dcm` | MR | Priya Nandakumar (PAT-11058) | MR Brain - Axial T2 FLAIR |
| `cr-chest.dcm` | CR | Diego Alvarez (PAT-11091) | CR Chest - Posteroanterior (PA) |

Each file is a genuine DICOM Part 10 file (128-byte preamble + `DICM` magic bytes,
real `PatientName`/`Modality`/`StudyDescription` tags, real 16-bit pixel data), so
uploading one exercises the full pipeline: DICM validation → S3 storage → NATS queue
→ pydicom metadata extraction → pixel rendering → live view in the dashboard with
the "LIVE DICOM RENDER" badge.

Generated with `pydicom`; see the worker service for the corresponding parsing code.
