import React, { useState, useEffect, useRef } from 'react';
import { 
  FolderHeart, 
  Layers, 
  FileCheck, 
  Radio, 
  Eye, 
  Sliders, 
  Maximize2, 
  Cpu, 
  Ruler, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  Database,
  Grid,
  ChevronRight,
  TrendingUp,
  Download
} from 'lucide-react';

interface PatientStudy {
  study_uid: string;
  patient_id: string;
  patient_name: string;
  gender: string;
  dob: string;
  modality: string;
  study_description: string;
  study_date: string;
  slice_count: number;
}

interface DICOMTag {
  id: number;
  study_uid: string;
  tag_key: string;
  tag_name: string;
  tag_value: string;
}

export default function App() {
  const [studies, setStudies] = useState<PatientStudy[]>([]);
  const [activeStudy, setActiveStudy] = useState<PatientStudy | null>(null);
  const [tags, setTags] = useState<DICOMTag[]>([]);
  
  // Interactive Viewport States (Window width & center)
  const [windowCenter, setWindowCenter] = useState(40);
  const [windowWidth, setWindowWidth] = useState(400);
  const [zoomLevel, setWindowZoom] = useState(1.0);
  const [isCrosshairOn, setIsCrosshairOn] = useState(false);
  const [caliperPoints, setCaliperPoints] = useState<{ x1: number, y1: number, x2: number, y2: number } | null>(null);
  const [isDrawingCaliper, setIsDrawingCaliper] = useState(false);
  const [caliperDistance, setCaliperDistance] = useState<string | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [uploading, setUploading] = useState(false);

  // Auto-resolve backend API address dynamically at runtime in Zerops
  let API_BASE = window.location.origin.includes('5173') ? 'http://localhost:3000' : '';
  if (API_BASE === '' && window.location.hostname.includes('.zerops.app')) {
    const parts = window.location.hostname.split('.');
    const serviceProj = parts[0].split('-');
    const projId = serviceProj.slice(1).join('-');
    const region = parts[1];
    API_BASE = `https://api-${projId}-3000.${region}.zerops.app`;
  }

  // Fetch clinical studies from PostgreSQL
  const fetchStudies = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/studies`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setStudies(data);
        if (data.length > 0 && !activeStudy) {
          setActiveStudy(data[0]);
        }
      }
    } catch (e) {
      console.error('Failed to connect to database API:', e);
    }
  };

  // Fetch parsed DICOM metadata tags for active study
  const fetchTags = async (studyUid: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/studies/${studyUid}/tags`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setTags(data);
      }
    } catch (e) {
      console.error('Failed to fetch study tags:', e);
    }
  };

  useEffect(() => {
    fetchStudies();
    const interval = setInterval(fetchStudies, 6000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeStudy) {
      fetchTags(activeStudy.study_uid);
    }
  }, [activeStudy]);

  // Procedural Medical Canvas Rendering Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear Canvas
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, width, height);

    // Procedural Brain/X-Ray image builder based on active patient modality
    if (activeStudy?.modality === 'MR') {
      // Procedural MRI Slice Simulation
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.scale(zoomLevel, zoomLevel);

      // Render brain contour using canvas arcs
      ctx.beginPath();
      ctx.arc(0, -10, 110, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(148, 163, 184, ${windowWidth / 600})`;
      ctx.lineWidth = 4;
      ctx.stroke();

      // Ventricles structure inside
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.1, 1 - (windowCenter / 100))})`;
      ctx.beginPath();
      ctx.ellipse(-30, -20, 20, 45, Math.PI / 6, 0, Math.PI * 2);
      ctx.ellipse(30, -20, 20, 45, -Math.PI / 6, 0, Math.PI * 2);
      ctx.fill();

      // Cerebellum folds procedural lines
      ctx.strokeStyle = `rgba(125, 211, 252, ${Math.max(0.2, 0.8 - (windowCenter / 150))})`;
      ctx.lineWidth = 1.5;
      for (let i = -50; i < 50; i += 12) {
        ctx.beginPath();
        ctx.moveTo(-60, i);
        ctx.quadraticCurveTo(0, i + 8, 60, i);
        ctx.stroke();
      }

      ctx.restore();
    } else if (activeStudy?.modality === 'CR') {
      // Procedural Chest X-Ray Simulator
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.scale(zoomLevel, zoomLevel);

      // Spine column
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.2, 1.2 - (windowCenter / 90))})`;
      ctx.fillRect(-15, -160, 30, 320);

      // Rib Cage lines left and right
      ctx.strokeStyle = `rgba(203, 213, 225, ${Math.max(0.2, windowWidth / 500)})`;
      ctx.lineWidth = 6;
      for (let i = -120; i < 120; i += 24) {
        ctx.beginPath();
        ctx.arc(-80, i, 45, Math.PI * 0.8, Math.PI * 1.8);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(80, i, 45, Math.PI * 1.2, Math.PI * 0.2);
        ctx.stroke();
      }

      // Heart outline shadow
      ctx.fillStyle = `rgba(251, 113, 133, ${Math.max(0.05, 0.4 - (windowCenter / 200))})`;
      ctx.beginPath();
      ctx.arc(25, 20, 50, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    } else {
      // Procedure CT slice with multiple organs
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.scale(zoomLevel, zoomLevel);

      // Abdominal wall
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.8)';
      ctx.lineWidth = 8;
      ctx.strokeRect(-140, -140, 280, 280);

      // Procedural Kidney shapes
      ctx.fillStyle = `rgba(167, 243, 208, ${Math.max(0.1, 0.9 - (windowCenter / 120))})`;
      ctx.beginPath();
      ctx.ellipse(-80, 20, 25, 45, Math.PI / 4, 0, Math.PI * 2);
      ctx.ellipse(80, 20, 25, 45, -Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // Grid Overlay
    if (isCrosshairOn) {
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.25)';
      ctx.lineWidth = 1;
      // Vert line
      ctx.beginPath();
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(width / 2, height);
      ctx.stroke();
      // Horiz line
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
    }

    // Active Orthopedic Measurement Caliper line drawing
    if (caliperPoints) {
      ctx.strokeStyle = '#10b981'; // vibrant clinical green
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(caliperPoints.x1, caliperPoints.y1);
      ctx.lineTo(caliperPoints.x2, caliperPoints.y2);
      ctx.stroke();

      // Measurement End nodes
      ctx.fillStyle = '#059669';
      ctx.beginPath();
      ctx.arc(caliperPoints.x1, caliperPoints.y1, 5, 0, Math.PI * 2);
      ctx.arc(caliperPoints.x2, caliperPoints.y2, 5, 0, Math.PI * 2);
      ctx.fill();

      // Caliper measurement label
      if (caliperDistance) {
        ctx.fillStyle = '#020617';
        ctx.fillRect((caliperPoints.x1 + caliperPoints.x2) / 2 - 40, (caliperPoints.y1 + caliperPoints.y2) / 2 - 12, 80, 24);
        ctx.strokeStyle = '#10b981';
        ctx.strokeRect((caliperPoints.x1 + caliperPoints.x2) / 2 - 40, (caliperPoints.y1 + caliperPoints.y2) / 2 - 12, 80, 24);

        ctx.font = 'bold 10px monospace';
        ctx.fillStyle = '#34d399';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(caliperDistance, (caliperPoints.x1 + caliperPoints.x2) / 2, (caliperPoints.y1 + caliperPoints.y2) / 2);
      }
    }
  }, [activeStudy, windowWidth, windowCenter, zoomLevel, isCrosshairOn, caliperPoints, caliperDistance]);

  // Caliper Mouse handlers
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCaliperPoints({ x1: x, y1: y, x2: x, y2: y });
    setIsDrawingCaliper(true);
    setCaliperDistance(null);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingCaliper || !caliperPoints) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCaliperPoints(prev => prev ? { ...prev, x2: x, y2: y } : null);

    // Calculate real world medical scale (pixel distance mapped to physical millimeters)
    const dx = x - caliperPoints.x1;
    const dy = y - caliperPoints.y1;
    const pixDist = Math.sqrt(dx * dx + dy * dy);
    const mmDist = (pixDist * 0.28).toFixed(2); // 0.28 mm per pixel medical resolution
    setCaliperDistance(`${mmDist} mm`);
  };

  const handleCanvasMouseUp = () => {
    setIsDrawingCaliper(false);
  };

  // Clinical LUT Window Presets
  const applyClinicalLUT = (center: number, width: number) => {
    setWindowCenter(center);
    setWindowWidth(width);
  };

  // DICOM Ingest process via API
  const handleIngestDICOM = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', e.target.files[0]);

    try {
      await fetch(`${API_BASE}/api/dicom-ingest`, { method: 'POST', body: formData });
      setTimeout(fetchStudies, 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 font-sans text-slate-100 overflow-hidden selection:bg-teal-500 selection:text-slate-950">
      
      {/* 1. Sidebar - Modality Study List */}
      <div className="w-80 border-r border-slate-900 bg-slate-900/60 flex flex-col p-5 space-y-4 backdrop-blur-md">
        
        {/* Workspace Brand Logo */}
        <div className="flex items-center space-x-2 pb-2 border-b border-slate-800">
          <Layers className="h-6 w-6 text-sky-400 animate-pulse" />
          <div>
            <h1 className="font-extrabold text-lg leading-tight tracking-tight text-slate-200">Aether<span className="text-sky-400">PACS</span></h1>
            <p className="text-xxs text-slate-400 font-mono tracking-widest uppercase">Diagnostic Diagnostic Server</p>
          </div>
        </div>

        {/* Upload Container */}
        <div>
          <label className="border border-dashed border-slate-800 hover:border-sky-500 hover:bg-sky-500/5 rounded-xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-2 group">
            {uploading ? (
              <RefreshCw className="h-6 w-6 text-sky-400 animate-spin" />
            ) : (
              <FolderHeart className="h-6 w-6 text-sky-400 group-hover:scale-110 transition duration-300" />
            )}
            <span className="font-bold text-xs text-slate-300">Upload DICOM Binary</span>
            <span className="text-xxs text-slate-500">DICOM modality format (.dcm)</span>
            <input type="file" onChange={handleIngestDICOM} className="hidden" accept=".dcm" />
          </label>
        </div>

        {/* Clinical Studies list */}
        <div className="flex-1 flex flex-col space-y-2 overflow-y-auto">
          <h2 className="text-xxs font-bold text-slate-400 tracking-widest uppercase pb-1 flex items-center justify-between">
            <span>Clinical Active Studies</span>
            <span className="px-1.5 py-0.5 bg-slate-950 rounded text-slate-500 text-xxs font-mono">{studies.length} studies</span>
          </h2>

          <div className="space-y-2 pr-1">
            {studies.map(study => (
              <button
                key={study.study_uid}
                onClick={() => setActiveStudy(study)}
                className={`w-full text-left p-3 rounded-xl transition duration-300 border flex flex-col space-y-2 ${activeStudy?.study_uid === study.study_uid ? 'bg-sky-500/10 border-sky-400/40 text-sky-300 shadow-lg' : 'bg-slate-950/40 border-slate-900/60 hover:bg-slate-900/40'}`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xxs font-mono font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-950 text-sky-400">{study.modality}</span>
                  <span className="text-xxs text-slate-500 font-mono">{new Date(study.study_date).toLocaleDateString()}</span>
                </div>
                <div className="truncate">
                  <p className="font-bold text-xs truncate text-slate-200">{study.patient_name}</p>
                  <p className="text-xxs text-slate-400 truncate">{study.study_description}</p>
                </div>
                <div className="flex justify-between items-center text-xxs text-slate-500 pt-1 border-t border-slate-900">
                  <span>ID: {study.patient_id}</span>
                  <span>{study.slice_count} Slices</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Service Status Dashboard */}
        <div className="pt-3 border-t border-slate-800 space-y-1 text-xxs text-slate-500 font-mono">
          <div className="flex items-center justify-between">
            <span>PACS API</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">● <span className="text-slate-500 font-normal">api</span></span>
          </div>
          <div className="flex items-center justify-between">
            <span>NATS Queuer</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">● <span className="text-slate-500 font-normal">queue</span></span>
          </div>
          <div className="flex items-center justify-between">
            <span>Postgres PACS</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">● <span className="text-slate-500 font-normal">db</span></span>
          </div>
        </div>

      </div>

      {/* 2. Middle - Interactive Diagnostic DICOM Viewer */}
      <div className="flex-1 flex flex-col h-full bg-slate-950">
        
        {/* Header Bar */}
        <div className="h-16 border-b border-slate-900 px-6 flex items-center justify-between bg-slate-900/10">
          <div className="flex items-center space-x-2">
            <Radio className="h-4.5 w-4.5 text-sky-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Primary Diagnostic Diagnostic Viewport</span>
          </div>
          <div className="flex items-center space-x-3 text-xxs font-mono text-slate-400 bg-slate-900 border border-slate-800 rounded-full px-4 py-1">
            <span>PACS Active Node: ZCP Core-A</span>
            <span className="text-sky-500">●</span>
            <span>VXLAN Connected</span>
          </div>
        </div>

        {/* Diagnostic Panel Viewport */}
        <div className="flex-1 flex flex-col p-6 space-y-4 overflow-hidden justify-center items-center">
          
          {/* Viewer Info Metadata Overlay */}
          <div className="w-full max-w-2xl flex items-center justify-between text-xxs text-slate-400 font-mono bg-slate-900/40 p-3 rounded-lg border border-slate-900">
            <div className="space-y-1">
              <p>PATIENT: <span className="text-slate-100 font-bold">{activeStudy?.patient_name || 'NOT LOADED'}</span></p>
              <p>STUDY: <span className="text-slate-300">{activeStudy?.study_description || 'N/A'}</span></p>
            </div>
            <div className="space-y-1 text-right">
              <p>DOB: {activeStudy ? new Date(activeStudy.dob).toLocaleDateString() : 'N/A'} ({activeStudy?.gender})</p>
              <p className="text-sky-400 font-bold">UID: {activeStudy?.study_uid.slice(0, 24)}...</p>
            </div>
          </div>

          {/* Interactive HTML5 Diagnostic Viewport */}
          <div className="relative border-4 border-slate-900 rounded-xl overflow-hidden shadow-2xl bg-slate-950 flex items-center justify-center">
            <canvas
              ref={canvasRef}
              width={512}
              height={512}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              className="cursor-crosshair shadow-inner"
            />

            {/* Scale Resolution Overlay */}
            <div className="absolute left-4 top-4 text-xxs font-mono text-slate-400/80 bg-slate-950/80 p-2 rounded border border-slate-900/60 pointer-events-none">
              <p>ZOOM: {(zoomLevel * 100).toFixed(0)}%</p>
              <p>W/W: {windowWidth}</p>
              <p>W/C: {windowCenter}</p>
            </div>

            <div className="absolute right-4 top-4 text-xxs font-mono text-slate-400/80 bg-slate-950/80 p-2 rounded border border-slate-900/60 text-right pointer-events-none">
              <p>MODALITY: {activeStudy?.modality}</p>
              <p>RES: 512 x 512 px</p>
              <p>DPI: 0.28 mm/px</p>
            </div>
          </div>

          {/* Viewport Control Bar */}
          <div className="w-full max-w-2xl bg-slate-900/50 p-4 rounded-xl border border-slate-900 flex items-center justify-between">
            
            {/* LUT Preset Shortcuts */}
            <div className="flex items-center space-x-1.5">
              <span className="text-xxs font-mono text-slate-500 font-bold uppercase mr-1">LUT:</span>
              <button onClick={() => applyClinicalLUT(40, 400)} className="px-2 py-1 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded text-xxs font-semibold">Brain</button>
              <button onClick={() => applyClinicalLUT(35, 1200)} className="px-2 py-1 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded text-xxs font-semibold">Lung</button>
              <button onClick={() => applyClinicalLUT(300, 1500)} className="px-2 py-1 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded text-xxs font-semibold">Bone</button>
              <button onClick={() => applyClinicalLUT(50, 350)} className="px-2 py-1 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded text-xxs font-semibold">Soft</button>
            </div>

            {/* Auxiliary overlays and options */}
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => setIsCrosshairOn(!isCrosshairOn)} 
                className={`p-2 rounded-lg transition duration-200 border ${isCrosshairOn ? 'bg-sky-500/10 border-sky-400 text-sky-400' : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900'}`}
                title="Toggle Diagnostic Grid"
              >
                <Grid className="h-4 w-4" />
              </button>
              <button 
                onClick={() => { setCaliperPoints(null); setCaliperDistance(null); }}
                className="p-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-lg text-slate-400 transition"
                title="Clear Caliper Line"
              >
                <Ruler className="h-4 w-4" />
              </button>
              <button 
                onClick={() => setWindowZoom(prev => prev === 1.0 ? 1.4 : prev === 1.4 ? 1.8 : 1.0)} 
                className="p-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-lg text-slate-400 transition"
                title="Toggle Magnification Level"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* 3. Right - Interactive Window Sliders & DICOM Header tags */}
      <div className="w-80 border-l border-slate-900 bg-slate-900/40 flex flex-col p-5 space-y-4 overflow-hidden justify-between">
        
        {/* Top: Window/Center Sliders */}
        <div className="space-y-4">
          <div className="flex items-center space-x-1.5 pb-2 border-b border-slate-800">
            <Sliders className="h-4 w-4 text-sky-400" />
            <h3 className="text-xxs font-extrabold uppercase tracking-wider text-slate-300">W/W & W/C Windowing LUT</h3>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-xxs font-mono">
                <span className="text-slate-400">Window Center (Brightness)</span>
                <span className="text-sky-400 font-bold">{windowCenter} HU</span>
              </div>
              <input
                type="range"
                min="-200"
                max="500"
                value={windowCenter}
                onChange={(e) => setWindowCenter(parseInt(e.target.value))}
                className="w-full accent-sky-400 bg-slate-950 h-1 rounded"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xxs font-mono">
                <span className="text-slate-400">Window Width (Contrast)</span>
                <span className="text-sky-400 font-bold">{windowWidth} HU</span>
              </div>
              <input
                type="range"
                min="50"
                max="2000"
                value={windowWidth}
                onChange={(e) => setWindowWidth(parseInt(e.target.value))}
                className="w-full accent-sky-400 bg-slate-950 h-1 rounded"
              />
            </div>
          </div>
        </div>

        {/* Middle: Parsed DICOM Header Tag Catalog */}
        <div className="flex-1 flex flex-col space-y-2 overflow-hidden min-h-0 pt-4">
          <div className="flex items-center space-x-1.5 pb-2 border-b border-slate-800">
            <FileCheck className="h-4 w-4 text-sky-400" />
            <h3 className="text-xxs font-extrabold uppercase tracking-wider text-slate-300">Extracted DICOM Tag Headers</h3>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {tags.map(tag => (
              <div key={tag.id} className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-900 text-xxs flex flex-col space-y-1">
                <div className="flex justify-between font-mono text-xxs">
                  <span className="text-sky-400 font-semibold">{tag.tag_key}</span>
                  <span className="text-slate-500 font-medium">{tag.tag_name}</span>
                </div>
                <p className="text-slate-200 font-bold font-mono truncate">{tag.tag_value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Panel Description */}
        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-900 pointer-events-none">
          <h4 className="text-xxs font-bold text-slate-300 flex items-center gap-1.5 mb-1.5 uppercase">
            <Cpu className="h-3 w-3 text-sky-400" /> Diagnostic Guidelines
          </h4>
          <p className="text-xxs text-slate-500 leading-relaxed leading-normal">
            Radiologists can draw calibrated measurement calipers directly on raw pixels. Pixel values map via Hounsfield (HU) scale filters inside the canvas pipeline.
          </p>
        </div>

      </div>

    </div>
  );
}
