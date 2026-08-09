# 🏥 AetherPACS: Clinical Diagnostic Web PACS & Medical DICOM Ingestion Engine

A compact, zero-footprint Picture Archiving and Communication System (PACS) designed to store, process, and view medical scans (X-ray, CT, MRI) in DICOM format directly from a web browser.

Instead of relying on heavy desktop software or expensive on-premise hardware, AetherPACS runs a decoupled multi-service ingestion pipeline that processes raw uploads, extracts clinical metadata, and renders diagnostic images on demand.

## The Problem & Why It Matters

Standard medical PACS installations are expensive, vendor-locked, and complex. They are built for major hospitals with large budgets, requiring dedicated local servers, high-performance GPUs, and specialized IT support.

For small clinics, rural practices, or medical facilities in lower-income regions, these systems are financially out of reach. In practice, this means medical scans are often burned onto physical CDs that patients must carry themselves, or photographed on mobile phones to be sent over WhatsApp between consulting doctors. This compromises patient privacy, destroys image clarity, and delays diagnostic timelines.

## The Value
AetherPACS is a proof of concept showing that core medical imaging capabilities—storing scans securely, extracting metadata automatically, and providing a diagnostic-quality viewer—can scale down to run on modern, usage-based utility infrastructure. By shifting pixel processing to the client browser and offloading file parsing to a background queue, the entire application can run for dollars a month instead of requiring a six-figure upfront license.

## Step-by-Step Testing & Verification

**Method A: Testing via the Web UI**

Open your local terminal and execute these commands to send a file through the raw pipeline:

1. Ingest a Raw DICOM Binary
Upload a raw abdominal CT scan directly to your public API gateway:

```
curl -X POST -F "file=@dicom-files/ct-abdomen.dcm" \
  https://api-21f-3000.ny1.zerops.app/api/dicom-ingest
```
Expected Result: A success response showing that the raw binary was validated, stored in S3, and queued for asynchronous processing.


2. Confirm Ingestion & Retrieve the UID
Fetch the listed studies from the relational database to verify it was parsed. Copy the study_uid from the JSON response:
```
curl https://api-21f-3000.ny1.zerops.app/api/studies
```
Expected Result: A JSON array of extracted patient records. Copy the unique study_uid of the newly uploaded study from the response (e.g., 1.2.840.113619.2.135...).

3. Inspect Extracted DICOM Header Tags
Query the parsed binary tags for that specific study:
```
curl https://api-21f-3000.ny1.zerops.app/api/studies/<study_uid>/tags
```
Expected Result: A complete schema output of parsed group-element headers (such as patient name, scanning modality, kVp, and exposure times).

















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

Each service is mapped to a purpose-built container in your import-pacs.yaml infrastructure-as-code manifest:

1. web (Static Nginx Runtime): Serves the compiled React/Vite client. Public traffic enters through here.
2. api (Node.js/Express Runtime): Validates incoming requests, saves study schema definitions in the database, pushes raw binaries to storage, and publishes parsing tasks.
3. worker (Python Runtime): A background Ubuntu-based service that runs a custom preparation phase (prepareCommands) to compile and link optimized system libraries (python3-numpy and python3-scipy). It listens to NATS, parses binary headers, and generates diagnostic PNG previews.
4. db (Managed PostgreSQL): Holds patient records, study indexes, and extracted tag structures.
5. queue (Managed NATS): Handles fast, low-latency task distribution between the API and background worker.
6. storage (Managed Object Storage): An S3-compatible local bucket storing raw medical DICOMs and generated image slices.

## Zero-Config Private Networking
All backend communication is kept isolated within a private VXLAN network. The services communicate directly using Zerops' internal hostnames (http://api:3000, nats://queue:4222, db:5432, and http://storage). Port definitions are controlled dynamically by your committed zerops.yaml, allowing automatic service-to-service discovery without exposing sensitive databases or messaging queues to the public internet.





























