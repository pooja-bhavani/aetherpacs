# 🏥 AetherPACS: Clinical Diagnostic Web PACS & Medical DICOM Ingestion Engine

A compact, zero-footprint Picture Archiving and Communication System (PACS) designed to store, process, and view medical scans (X-ray, CT, MRI) in DICOM format directly from a web browser.

Instead of relying on heavy desktop software or expensive on-premise hardware, AetherPACS runs a decoupled multi-service ingestion pipeline that processes raw uploads, extracts clinical metadata, and renders diagnostic images on demand.

## The Problem & Why It Matters

Standard medical PACS installations are expensive, vendor-locked, and complex. They are built for major hospitals with large budgets, requiring dedicated local servers, high-performance GPUs, and specialized IT support.

For small clinics, rural practices, or medical facilities in lower-income regions, these systems are financially out of reach. In practice, this means medical scans are often burned onto physical CDs that patients must carry themselves, or photographed on mobile phones to be sent over WhatsApp between consulting doctors. This compromises patient privacy, destroys image clarity, and delays diagnostic timelines.

## The Value
AetherPACS is a proof of concept showing that core medical imaging capabilities—storing scans securely, extracting metadata automatically, and providing a diagnostic-quality viewer—can scale down to run on modern, usage-based utility infrastructure. By shifting pixel processing to the client browser and offloading file parsing to a background queue, the entire application can run for dollars a month instead of requiring a six-figure upfront license.

## Diagnostic Interface & Front-End Design
Radiologists work in dark reading rooms to maximize contrast perception and minimize eye strain. The interface is custom-designed around this environment:

- Contrast-Optimized Theme: A deep-slate (#020617) base layout highlighted by precise clinical emerald (#10b981) and neon sky-blue interactive elements.
  
- HTML5 Canvas Viewport: Implements raw pixel manipulation directly in the browser:
• Interactive Window Width (W/W) and Window Center (W/C) Sliders: Adjust Hounsfield Unit (HU) brightness and contrast levels dynamically without server-side recalculations.
• Modality LUT Presets: Fast buttons to instantly re-map look-up tables (LUT) for specific medical targets (Bone, Lung, Brain, Soft Tissue).
• Orthopedic Measurement Calipers: Click and drag directly on the canvas to measure anatomical features, with distance calculated in physical millimeters (mm) based on embedded DICOM pixel spacing.
• Crosshair Overlays & Magnification: Toggle alignment grids and zoom multipliers to inspect fine details.
