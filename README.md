# 🏥 AetherPACS: Clinical Diagnostic Web PACS & Medical DICOM Ingestion Engine
A small PACS system — the kind of software hospitals use to store, process, and view medical scans (X-ray, CT, MRI) in DICOM format. Upload a scan and it moves through a real processing pipeline before showing up in a browser-based viewer.

## What it Does 

Three services sit behind the web dashboard. An API accepts DICOM uploads and stores the raw file in object storage. A queue hands the file off for processing. A worker reads the file's actual metadata — patient info, scan type, study details and renders its real pixel data into an image. Postgres holds everything, and the dashboard polls for new studies as they land, so there's no manual refresh and no desktop viewer software to install.

## The Problem & Why It Matters

Standard medical PACS installations are expensive, vendor-locked, and complex. They are built for major hospitals with large budgets, requiring dedicated local servers, high-performance GPUs, and specialized IT support.

For small clinics, rural practices, or medical facilities in lower-income regions, these systems are financially out of reach. In practice, this means medical scans are often burned onto physical CDs that patients must carry themselves, or photographed on mobile phones to be sent over WhatsApp between consulting doctors. This compromises patient privacy, destroys image clarity, and delays diagnostic timelines.

## The Value
AetherPACS is a proof of concept showing that core medical imaging capabilities—storing scans securely, extracting metadata automatically, and providing a diagnostic-quality viewer—can scale down to run on modern, usage-based utility infrastructure. By shifting pixel processing to the client browser and offloading file parsing to a background queue, the entire application can run for dollars a month instead of requiring a six-figure upfront license.


[Zerops ZCP Quickstart](https://docs.zerops.io/zcp/quickstart)

[Zerops Account Setup](https://zerops.io/?utm_source=kunal)

<img width="1469" height="884" alt="Screenshot 2026-08-09 at 8 28 39 PM" src="https://github.com/user-attachments/assets/80be0b43-7bc0-4017-8c5c-3e27439b6ea3" />

--- 

## Step-by-Step Project Testing & Verification

### 1. Open the Dashboard
Navigate to your live web diagnostic workspace:
👉 **[https://web-21f.ny1.zerops.app/](https://web-21f.ny1.zerops.app/)**

How it works
1.Upload — the API gateway validates the DICOM file and stores it in S3-compatible object storage
2.Queue — an ingest job is dispatched over NATS for asynchronous processing
3.Parse — a Python worker consumes the queue, extracts study metadata, and writes it to PostgreSQL
4.View — this dashboard polls live studies and renders the diagnostic viewport below

### 2. Drive the Pipeline via Terminal
You can also run testing commands directly from your shell. Three sample DICOM files are included in the `dicom-files/` directory for this purpose.

* **Upload a scan:**
  ```bash
  curl -X POST -F "file=@dicom-files/ct-abdomen.dcm" \
    https://api-21f-3000.ny1.zerops.app/api/dicom-ingest
  
* Verify it landed in Postgres:
Inspect the extracted DICOM header tags: (Replace <study_uid> with the UID returned in the response above)
:
Fetch the rendered preview PNG:
Test validation rules: Uploading a file that isn't a real DICOM scan (like a text file) is instantly blocked and turned away with a 400 Bad Request because the Express gateway validates the standard DICM signature bytes.






## How Deeply is Zerops leveraged in this project
AetherPACS is built as a fully decoupled, production-grade 6-service system. There are no external cloud accounts or third-party platforms involved; Zerops serves as the complete bare-metal infrastructure and deployment layer.

                      [ Public Internet ]
                               │
                               ▼ (Port 80/443)
                  ┌─────────────────────────┐
                  │    Nginx Web Server     │ (web)
                  └────────────┬────────────┘
                               │ (Internal Routing)
                               ▼ (Port 3000)
                  ┌─────────────────────────┐
                  │   Node.js API Gateway   │ (api)
                  └──────┬────────────┬─────┘
                         │            │
             ┌───────────┘            └───────────┐
             ▼ (Postgres TCP)                     ▼ (NATS TCP)
    ┌─────────────────┐                  ┌─────────────────┐
    │  PostgreSQL DB  │ (db)             │   NATS Queue    │ (queue)
    └─────────────────┘                  └────────┬────────┘
                                                  │
                                                  ▼ (Asynchronous)
                                         ┌─────────────────┐
                                         │  Python Parser  │ (worker)
                                         └────────┬────────┘
                                                  │ (S3 Upload)
                                                  ▼ (Port 80)
                                         ┌─────────────────┐
                                         │   S3 Storage    │ (storage)
                                         └─────────────────┘

* **Zero-Trust Private VXLAN:** Zerops provisions all six services and automatically secures the connections between them on an isolated private network, allowing the API and background worker to query Postgres and publish to NATS without exposing database ports or credentials to the public internet.
* **Source-to-Container Deployments:** Build pipelines run straight from our Git repository over secure SSH, driven by a `zerops.yaml` file per service.
* **ZCP Remote Workspace:** We leveraged the **Zerops Control Plane (ZCP)** workspace container, utilizing its built-in Browser VS Code (Cloud IDE) and automated Claude Code agent to write, deploy, and debug in-network services in real-time.


## System Limitations & Codec Exclusions

DICOM files with compressed pixel data (common in real clinical exports) get their metadata extracted correctly but won't render an image. The specialized C++ decompression codec library required for this task failed to build on this container OS, so it was excluded from this proof of concept. These studies still process and index correctly in the catalog, but display a yellow "procedural simulation" badge on the viewport instead of a live visual render.
















