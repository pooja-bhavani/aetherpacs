# 🏥 AetherPACS: Clinical Diagnostic Web PACS & Medical DICOM Ingestion Engine

AetherPACS is a production-grade, real-world DICOM Web Viewer and medical Picture Archiving and Communication System (PACS). Built for high-reliability radiology and clinical diagnostic teams, it runs a fully decoupled multi-service pipeline securely connected over a private VXLAN network on Zerops.

## 🏗️ Medical-Grade System Topology
1. **Clinical Web Dashboard (`web`)**: Compiled React SPA served via Nginx Static. Features an interactive HTML5 Canvas viewport for manipulating DICOM window width/center (W/W, W/C) and drawing orthopedic calipers.
2. **API Gateway (`api`)**: Express backend storing DICOM study schemas in PostgreSQL, routing binaries to S3, and queuing jobs via NATS.
3. **Clinical Parser (`worker`)**: Python worker processing raw medical images, parsing headers, and uploading slice previews back to S3.
4. **Relational Database (`db`)**: PostgreSQL storing structural DICOM headers, patient metadata, and diagnostic annotations.
5. **Message Broker (`queue`)**: NATS handling asynchronous task distribution between the API and Worker instances.
6. **Object Storage (`storage`)**: S3-compatible storage managing binary DICOM files and extracted web slices.

## 🛠️ Local Development & Deployment
* Run `./setup.sh` to initialize the directory locally.
* Create a fresh project on Zerops using `import-pacs.yaml`.
* Deploy instantly using Git push or the Zerops CLI!
