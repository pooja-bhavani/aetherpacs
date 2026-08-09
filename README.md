# 🏥 AetherPACS: Clinical Diagnostic Web PACS & Medical DICOM Ingestion Engine

A compact, zero-footprint Picture Archiving and Communication System (PACS) designed to store, process, and view medical scans (X-ray, CT, MRI) in DICOM format directly from a web browser.

Instead of relying on heavy desktop software or expensive on-premise hardware, AetherPACS runs a decoupled multi-service ingestion pipeline that processes raw uploads, extracts clinical metadata, and renders diagnostic images on demand.

## The Problem & Why It Matters

Standard medical PACS installations are expensive, vendor-locked, and complex. They are built for major hospitals with large budgets, requiring dedicated local servers, high-performance GPUs, and specialized IT support.

For small clinics, rural practices, or medical facilities in lower-income regions, these systems are financially out of reach. In practice, this means medical scans are often burned onto physical CDs that patients must carry themselves, or photographed on mobile phones to be sent over WhatsApp between consulting doctors. This compromises patient privacy, destroys image clarity, and delays diagnostic timelines.

## The Value
AetherPACS is a proof of concept showing that core medical imaging capabilities—storing scans securely, extracting metadata automatically, and providing a diagnostic-quality viewer—can scale down to run on modern, usage-based utility infrastructure. By shifting pixel processing to the client browser and offloading file parsing to a background queue, the entire application can run for dollars a month instead of requiring a six-figure upfront license.

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
