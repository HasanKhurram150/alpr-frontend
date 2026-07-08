"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import TopBar from "@/components/ui/TopBar";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { DetectionResult, VehicleInfo } from "@/types";
import {
  Upload,
  Video,
  Car,
  X,
  Play,
  CheckCircle,
  Activity,
  User,
  Square,
  Globe,
  AlertTriangle,
  Pause,
} from "lucide-react";
import { useTheme } from "@/lib/ThemeContext";

function ConfBadge({ v }: { v: number }) {
  const pct = Math.round(v * 100);
  const [color, bg] =
    pct >= 90
      ? ["#30D158", "rgba(48,209,88,0.1)"]
      : pct >= 70
        ? ["#FF9500", "rgba(255,149,0,0.1)"]
        : ["#FF3B30", "rgba(255,59,48,0.1)"];
  return (
    <span
      className="text-[10px] font-bold tabular-nums rounded-full px-2 py-0.5"
      style={{ color, background: bg }}
    >
      {pct}%
    </span>
  );
}

function RegionSelect({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const { isLightMode } = useTheme();
  const selectBg = isLightMode
    ? "bg-white border-slate-100"
    : "bg-[#0e1114] border-[#222831]";
  const fontColor = isLightMode ? "text-slate-700" : "text-[#c8d0d8]";

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-2xl shadow-sm border ${selectBg} flex-1`}
    >
      <Globe
        size={14}
        className={isLightMode ? "text-slate-400" : "text-[#78899a]"}
      />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`text-sm font-semibold outline-none cursor-pointer w-full bg-transparent disabled:opacity-50 ${fontColor}`}
      >
        <option
          value="NORTH_AMERICAN"
          className={isLightMode ? "" : "bg-[#0e1114] text-[#c8d0d8]"}
        >
          North American / Pakistan ★
        </option>
        <option
          value="EUROPEAN"
          className={isLightMode ? "" : "bg-[#0e1114] text-[#c8d0d8]"}
        >
          European
        </option>
        <option
          value="MIDDLE_EASTERN"
          className={isLightMode ? "" : "bg-[#0e1114] text-[#c8d0d8]"}
        >
          Middle Eastern
        </option>
        <option
          value="ASIAN"
          className={isLightMode ? "" : "bg-[#0e1114] text-[#c8d0d8]"}
        >
          Asian (East Asia)
        </option>
        <option
          value="PACIFIC"
          className={isLightMode ? "" : "bg-[#0e1114] text-[#c8d0d8]"}
        >
          Pacific
        </option>
      </select>
    </div>
  );
}

// ─── Recognition result card (mimics Plate Recognizer layout) ───────────────
interface RecRow {
  label: string;
  value: string;
  conf?: number;
  alert?: boolean;
}

function RecognitionCard({
  title,
  rows,
  thumbnail,
  alert: isAlert,
}: {
  title: string;
  rows: RecRow[];
  thumbnail?: string;
  alert?: boolean;
}) {
  const { isLightMode } = useTheme();
  const border = isLightMode ? "border-slate-100" : "border-[#222831]";
  const headerBg = isAlert ? "#d93a3a" : isLightMode ? "#1D1D1F" : "#12161a";
  const bodyBg = isLightMode ? "bg-white" : "bg-[#0e1114]";
  const thBg = isLightMode ? "bg-slate-50" : "bg-black/35";
  const labelColor = isLightMode ? "text-slate-400" : "text-[#78899a]";
  const valColor = isLightMode ? "text-[#1D1D1F]" : "text-[#c8d0d8]";

  return (
    <div className={`rounded-2xl overflow-hidden border ${border} shadow-sm`}>
      <div className="px-4 py-2" style={{ background: headerBg }}>
        <span className="text-[11px] font-black text-white uppercase tracking-wider">
          {title}
        </span>
      </div>
      {thumbnail && (
        <div className={`${thBg} px-3 pt-2`}>
          <img
            src={`data:image/jpeg;base64,${thumbnail}`}
            alt={title}
            className="w-full h-20 object-contain rounded-2xl"
          />
        </div>
      )}
      {rows.map((row, i) => (
        <div
          key={i}
          className={`flex items-center justify-between px-4 py-2.5 ${bodyBg}`}
          style={{
            borderTop:
              i > 0 || thumbnail
                ? `1px solid ${isLightMode ? "#F2F2F7" : "#181d22"}`
                : undefined,
          }}
        >
          <span
            className={`text-xs font-medium flex-shrink-0 w-24 ${labelColor}`}
          >
            {row.label}
          </span>
          <div className="flex items-center gap-2">
            <span
              className={`text-sm font-bold capitalize ${row.alert ? "text-[#FF3B30]" : valColor}`}
            >
              {row.value}
            </span>
            {row.conf !== undefined && <ConfBadge v={row.conf} />}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Canvas overlay renderer ────────────────────────────────────────────────
function paintOverlay(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  det: DetectionResult | null,
  isLightMode: boolean,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth;
  const cssH = canvas.clientHeight;

  if (canvas.width !== cssW * dpr || canvas.height !== cssH * dpr) {
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);

  if (!det || video.videoWidth === 0) return;

  const vAR = video.videoWidth / video.videoHeight;
  const cAR = cssW / cssH;
  let rW = cssW,
    rH = cssH,
    oX = 0,
    oY = 0;
  if (vAR > cAR) {
    rH = cssW / vAR;
    oY = (cssH - rH) / 2;
  } else {
    rW = cssH * vAR;
    oX = (cssW - rW) / 2;
  }
  const sx = rW / video.videoWidth;
  const sy = rH / video.videoHeight;

  ctx.lineWidth = 2.5;
  ctx.font = "bold 11px system-ui, -apple-system, sans-serif";
  ctx.textBaseline = "alphabetic";

  const box = (
    x: number,
    y: number,
    w: number,
    h: number,
    stroke: string,
    fill: string,
    label: string,
  ) => {
    const rx = oX + x * sx,
      ry = oY + y * sy,
      rw = w * sx,
      rh = h * sy;
    ctx.strokeStyle = stroke;
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.roundRect(rx, ry, rw, rh, 3);
    ctx.fill();
    ctx.stroke();
    if (label) {
      const tw = ctx.measureText(label).width + 10;
      ctx.fillStyle = stroke;
      ctx.beginPath();
      ctx.roundRect(rx, Math.max(0, ry - 18), tw, 18, [3, 3, 0, 0]);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.fillText(label, rx + 5, Math.max(13, ry - 4));
    }
  };

  // Vehicles — amber (furthest back)
  for (const v of (det as any).vehicles ?? []) {
    box(
      v.boundingBox.x,
      v.boundingBox.y,
      v.boundingBox.width,
      v.boundingBox.height,
      "#FF9500",
      "rgba(255,149,0,0.10)",
      [v.make, v.model].filter(Boolean).join(" "),
    );
  }
  // Plates — blue (brand primary Deep Teal)
  for (const p of det.plates ?? []) {
    box(
      p.boundingBox.x,
      p.boundingBox.y,
      p.boundingBox.width,
      p.boundingBox.height,
      "#0A7E8C",
      "rgba(10, 126, 140, 0.12)",
      `${p.text}  ${Math.round(p.confidence * 100)}%`,
    );
  }
  // Faces — green or red for spoof
  for (const f of det.faces ?? []) {
    const spoof = (f as any).spoofDetected;
    const c = spoof ? "#FF3B30" : "#30D158";
    const bg = spoof ? "rgba(255,59,48,0.10)" : "rgba(48,209,88,0.10)";
    const lbl =
      (f as any).personName ?? `Face ${Math.round(f.confidence * 100)}%`;
    box(
      f.boundingBox.x,
      f.boundingBox.y,
      f.boundingBox.width,
      f.boundingBox.height,
      c,
      bg,
      lbl,
    );
  }
  // Weapon: red border
  if ((det as any).gunDetected) {
    ctx.strokeStyle = "#FF3B30";
    ctx.lineWidth = 5;
    ctx.strokeRect(3, 3, cssW - 6, cssH - 6);
    ctx.fillStyle = "rgba(255,59,48,0.08)";
    ctx.fillRect(0, 0, cssW, cssH);
    ctx.fillStyle = "rgba(255,59,48,0.9)";
    ctx.beginPath();
    ctx.roundRect(10, 10, 200, 26, 3);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 12px system-ui";
    ctx.fillText("⚠  WEAPON DETECTED", 16, 27);
  }
}

// ─── Image Detector Component ──────────────────────────────────────────────
function ImageDetector() {
  const { isLightMode } = useTheme();
  const { toast } = useToast();
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [region, setRegion] = useState("NORTH_AMERICAN");
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFile = (f: File) => {
    setFile(f);
    setResult(null);
    setPreview(URL.createObjectURL(f));
  };
  const clear = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
  };

  const detect = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await api.detect(fd, {
        region,
        maxPlates: "10",
        thumbnail: "true",
      });
      setResult(res);
      if (res.count === 0) toast("No detections found", "warning");
      else
        toast(
          `${res.count} result${res.count > 1 ? "s" : ""} detected`,
          "success",
        );
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const paintBoxes = useCallback(() => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas || !result) return;
    const dpr = window.devicePixelRatio || 1;
    const w = img.clientWidth,
      h = img.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const sx = w / img.naturalWidth,
      sy = h / img.naturalHeight;
    ctx.lineWidth = 2.5;
    ctx.font = "bold 11px system-ui,-apple-system,sans-serif";
    ctx.textBaseline = "alphabetic";
    const drawBox = (
      x: number,
      y: number,
      bw: number,
      bh: number,
      stroke: string,
      fill: string,
      label: string,
    ) => {
      const rx = x * sx,
        ry = y * sy,
        rw = bw * sx,
        rh = bh * sy;
      ctx.strokeStyle = stroke;
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.roundRect(rx, ry, rw, rh, 3);
      ctx.fill();
      ctx.stroke();
      if (label) {
        const tw = ctx.measureText(label).width + 10;
        ctx.fillStyle = stroke;
        ctx.beginPath();
        ctx.roundRect(rx, Math.max(0, ry - 18), tw, 18, [3, 3, 0, 0]);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.fillText(label, rx + 5, Math.max(13, ry - 4));
      }
    };
    for (const v of result.vehicles ?? [])
      drawBox(
        v.boundingBox.x,
        v.boundingBox.y,
        v.boundingBox.width,
        v.boundingBox.height,
        "#FF9500",
        "rgba(255,149,0,0.10)",
        [v.make, v.model].filter(Boolean).join(" "),
      );
    for (const p of result.plates ?? [])
      drawBox(
        p.boundingBox.x,
        p.boundingBox.y,
        p.boundingBox.width,
        p.boundingBox.height,
        "#0A7E8C",
        "rgba(10, 126, 140, 0.12)",
        `${p.text}  ${Math.round(p.confidence * 100)}%`,
      );
    for (const f of result.faces ?? []) {
      const spoof = (f as any).spoofDetected;
      drawBox(
        f.boundingBox.x,
        f.boundingBox.y,
        f.boundingBox.width,
        f.boundingBox.height,
        spoof ? "#FF3B30" : "#30D158",
        spoof ? "rgba(255,59,48,0.10)" : "rgba(48,209,88,0.10)",
        (f as any).personName ?? `Face ${Math.round(f.confidence * 100)}%`,
      );
    }
    if (result.gunDetected) {
      ctx.strokeStyle = "#FF3B30";
      ctx.lineWidth = 5;
      ctx.strokeRect(3, 3, w - 6, h - 6);
    }
  }, [result, isLightMode]);

  useEffect(() => {
    if (result) paintBoxes();
  }, [result, paintBoxes]);

  const vehicleRows = (v: VehicleInfo): RecRow[] =>
    [
      v.type ? { label: "Type", value: v.type, conf: v.confidence } : null,
      v.make || v.model
        ? {
            label: "Make/model",
            value: [v.make, v.model].filter(Boolean).join(" "),
          }
        : null,
      v.color ? { label: "Color", value: v.color } : null,
      v.view ? { label: "View", value: v.view } : null,
      !v.type
        ? { label: "Confidence", value: `${Math.round(v.confidence * 100)}%` }
        : null,
    ].filter(Boolean) as RecRow[];

  const boxBg = isLightMode
    ? "rgba(255,255,255,0.5) border-slate-200"
    : "bg-[#0e1114]/40 border-[#222831]";
  const titleColor = isLightMode ? "#1D1D1F" : "#c8d0d8";
  const subColor = isLightMode ? "#8E8E93" : "#78899a";

  return (
    <div className="space-y-5">
      {!result && (
        <div
          className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-300 ${dragging ? "border-amber-500 bg-amber-500/5" : ""} ${file ? "" : boxBg}`}
          style={
            file
              ? {
                  background: isLightMode ? "white" : "#0e1114",
                  borderColor: "#0A7E8C",
                  borderStyle: "solid",
                }
              : {}
          }
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files[0];
            if (f) handleFile(f);
          }}
          onClick={() => !file && inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          {preview ? (
            <div className="relative group">
              <img
                src={preview}
                alt="preview"
                className={`max-h-64 mx-auto rounded-2xl shadow-lg object-contain ${isLightMode ? "bg-slate-50" : "bg-black/30"}`}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clear();
                }}
                className={`absolute -top-3 -right-3 w-8 h-8 rounded-2xl shadow-md flex items-center justify-center transition-all ${
                  isLightMode
                    ? "bg-white text-slate-400 hover:text-red-500"
                    : "bg-[#181d22] text-[#78899a] hover:text-[#d93a3a]"
                }`}
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>
          ) : (
            <div className="py-6">
              <div
                className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center shadow-sm"
                style={{
                  background: isLightMode
                    ? "rgba(0,122,255,0.1)"
                    : "rgba(47,127,193,0.1)",
                }}
              >
                <Upload size={28} className="text-[#0A7E8C]" strokeWidth={2} />
              </div>
              <p
                className="text-lg font-bold tracking-tight"
                style={{ color: titleColor }}
              >
                Upload Image
              </p>
              <p className="text-sm mt-1.5" style={{ color: subColor }}>
                Drag and drop or click to browse
              </p>
              <div className="mt-6 flex items-center justify-center gap-3">
                {["JPG", "PNG", "20MB MAX"].map((l) => (
                  <span
                    key={l}
                    className={`px-2 py-1 text-[10px] font-bold rounded ${
                      isLightMode
                        ? "bg-slate-100 text-slate-400"
                        : "bg-[#181d22] text-[#78899a]"
                    }`}
                  >
                    {l}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {file && !result && (
        <div className="flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
          <RegionSelect value={region} onChange={setRegion} />
          <button
            onClick={detect}
            disabled={loading}
            className={`flex items-center gap-2 px-6 h-10 min-w-[140px] justify-center text-sm font-bold rounded-2xl transition-all shadow-md bg-[#0A7E8C] text-white hover:bg-[#126180]`}
          >
            {loading ? (
              <Activity size={16} className="animate-spin" />
            ) : (
              <Play size={16} fill="currentColor" />
            )}
            {loading ? "Processing…" : "Detect Now"}
          </button>
        </div>
      )}

      {result && (
        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
          {/* Status bar */}
          <div className="flex items-center justify-between">
            <div
              className="flex items-center gap-3 px-4 py-2.5 rounded-2xl"
              style={
                isLightMode
                  ? {
                      background: "rgba(48,209,88,0.1)",
                      border: "1px solid rgba(48,209,88,0.15)",
                    }
                  : {
                      background: "rgba(45,181,93,0.1)",
                      border: "1px solid rgba(45,181,93,0.2)",
                    }
              }
            >
              <CheckCircle
                size={15}
                className={isLightMode ? "text-[#30D158]" : "text-[#2db55d]"}
              />
              <span
                className={`text-sm font-bold ${isLightMode ? "text-[#248A3D]" : "text-[#2db55d]"}`}
              >
                {result.plates.length} plates · {result.faces.length} faces ·{" "}
                {result.vehicles.length} vehicles · {result.processingTimeMs}ms
              </span>
            </div>
            <button
              onClick={clear}
              className={`flex items-center gap-2 text-sm font-bold px-3 py-2 rounded-2xl transition-all ${
                isLightMode
                  ? "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                  : "text-[#78899a] hover:text-[#c8d0d8] hover:bg-[#181d22]"
              }`}
            >
              <X size={14} strokeWidth={2.5} /> New Image
            </button>
          </div>

          {/* Two-column view */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <div
              className={`relative inline-block w-full rounded-2xl overflow-hidden shadow-xl ${
                isLightMode ? "bg-slate-900" : "bg-black/35"
              }`}
            >
              <img
                ref={imgRef}
                src={preview!}
                alt="detection result"
                className="block w-full h-auto"
                style={{ maxHeight: 500, objectFit: "contain" }}
                onLoad={paintBoxes}
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 pointer-events-none"
                style={{ width: "100%", height: "100%" }}
              />
            </div>

            <div
              className="space-y-3 overflow-y-auto"
              style={{ maxHeight: 500 }}
            >
              {result.vehicles.map((v, i) => (
                <RecognitionCard
                  key={`v-${i}`}
                  title="Vehicle"
                  rows={vehicleRows(v)}
                />
              ))}
              {result.plates.map((p, i) => (
                <RecognitionCard
                  key={`p-${i}`}
                  title="License Plate"
                  thumbnail={p.thumbnail}
                  rows={[
                    { label: "Number", value: p.text, conf: p.confidence },
                    ...(p.region
                      ? [{ label: "Country", value: p.region }]
                      : []),
                    ...(p.personName
                      ? [{ label: "Person", value: p.personName }]
                      : []),
                  ]}
                />
              ))}
              {result.faces.map((f, i) => (
                <RecognitionCard
                  key={`f-${i}`}
                  title="Face"
                  thumbnail={f.thumbnail}
                  rows={[
                    {
                      label: "Confidence",
                      value: `${Math.round(f.confidence * 100)}%`,
                    },
                    ...((f as any).personName
                      ? [{ label: "Person", value: (f as any).personName }]
                      : []),
                    ...((f as any).spoofDetected
                      ? [{ label: "Spoof", value: "Detected", alert: true }]
                      : []),
                  ]}
                />
              ))}
              {result.gunDetected && (
                <RecognitionCard title="⚠ Weapon Detected" rows={[]} alert />
              )}
              {result.vehicles.length === 0 &&
                result.plates.length === 0 &&
                result.faces.length === 0 &&
                !result.gunDetected && (
                  <div
                    className={`py-12 text-center rounded-2xl border ${isLightMode ? "bg-white border-slate-100" : "bg-[#0e1114] border-[#222831]"}`}
                  >
                    <Activity
                      size={32}
                      className={`mx-auto mb-3 ${isLightMode ? "text-slate-200" : "text-[#3d4f5e]"}`}
                    />
                    <p className={`text-sm font-semibold ${subColor}`}>
                      No objects identified
                    </p>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Video Detector Component ──────────────────────────────────────────────
function VideoDetector() {
  const { isLightMode } = useTheme();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [region, setRegion] = useState("NORTH_AMERICAN");
  const [active, setActive] = useState(false);
  const [paused, setPaused] = useState(false);
  const [uniquePlates, setUniquePlates] = useState(0);
  const [faceCount, setFaceCount] = useState(0);
  const [gunCount, setGunCount] = useState(0);
  const [detFps, setDetFps] = useState(0);
  const [feedFrames, setFeedFrames] = useState<
    Array<DetectionResult & { videoTime: number }>
  >([]);
  const [platesOnly, setPlatesOnly] = useState(true);
  const [captureMode, setCaptureMode] = useState<
    "fast" | "balanced" | "accurate"
  >("balanced");
  const [droppedFrames, setDroppedFrames] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const captureRef = useRef<HTMLCanvasElement>(null);

  const activeRef = useRef(false);
  const processingRef = useRef(false);
  const lastCaptureRef = useRef(-1);
  const lastDetectionRef = useRef<DetectionResult | null>(null);
  const detMapRef = useRef(new Map<number, DetectionResult>());
  const allPlatesRef = useRef(new Set<string>());
  const rafRef = useRef<number | null>(null);
  const fpsWindow = useRef<number[]>([]);
  const sessionIdRef = useRef<string | null>(null);
  const platesOnlyRef = useRef(true);

  const MIN_INTERVAL =
    captureMode === "fast" ? 0.1 : captureMode === "balanced" ? 0.15 : 0.25;
  const JPEG_QUALITY = 0.88;

  const captureFrame = useCallback(
    (videoTime: number) => {
      const video = videoRef.current;
      const capture = captureRef.current;
      if (!video || !capture || video.videoWidth === 0) return;

      processingRef.current = true;
      lastCaptureRef.current = videoTime;

      const ctx = capture.getContext("2d")!;
      const CAPTURE_W = 640,
        CAPTURE_H = 360;
      capture.width = CAPTURE_W;
      capture.height = CAPTURE_H;
      ctx.drawImage(video, 0, 0, CAPTURE_W, CAPTURE_H);

      capture.toBlob(
        async (blob) => {
          if (!blob) {
            processingRef.current = false;
            return;
          }
          try {
            const fd = new FormData();
            fd.append("image", blob, "frame.jpg");
            const sid = sessionIdRef.current
              ? `&sessionId=${sessionIdRef.current}`
              : "";
            const fast = platesOnlyRef.current
              ? "&faces=false&vehicles=false"
              : "";
            const res = await fetch(
              `/api/alpr/detect?region=${region}&maxPlates=10&thumbnail=true${sid}${fast}`,
              { method: "POST", body: fd },
            );
            if (!res.ok) return;
            const result: DetectionResult = await res.json();

            lastDetectionRef.current = result;
            const lean = {
              ...result,
              plates:
                result.plates?.map((p) => ({ ...p, thumbnail: undefined })) ||
                [],
              faces:
                result.faces?.map((f) => ({ ...f, thumbnail: undefined })) ||
                [],
            };
            detMapRef.current.set(videoTime, lean);
            if (detMapRef.current.size > 500) {
              const oldest = detMapRef.current.keys().next().value;
              if (oldest !== undefined) {
                detMapRef.current.delete(oldest);
              }
            }

            result.plates?.forEach((p) => allPlatesRef.current.add(p.text));
            setUniquePlates(allPlatesRef.current.size);
            if (result.faces?.length)
              setFaceCount((n) => n + result.faces.length);
            if ((result as any).gunDetected) setGunCount((n) => n + 1);

            const now = Date.now();
            fpsWindow.current.push(now);
            fpsWindow.current = fpsWindow.current.filter((t) => now - t < 3000);
            setDetFps(Math.round(fpsWindow.current.length / 3));

            if (
              result.plates?.length ||
              result.faces?.length ||
              (result as any).gunDetected
            ) {
              setFeedFrames((prev) =>
                [{ ...result, videoTime }, ...prev].slice(0, 60),
              );
            }
          } catch {
            // ignore
          } finally {
            processingRef.current = false;
          }
        },
        "image/jpeg",
        JPEG_QUALITY,
      );
    },
    [region],
  );

  const startLoop = useCallback(() => {
    const loop = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;

      if (activeRef.current && !video.paused && !video.ended) {
        const t = video.currentTime;
        if (t - lastCaptureRef.current >= MIN_INTERVAL) {
          if (!processingRef.current) {
            captureFrame(t);
          } else {
            setDroppedFrames((n) => n + 1);
          }
        }
      }

      paintOverlay(canvas, video, lastDetectionRef.current, isLightMode);
      rafRef.current = requestAnimationFrame(loop);
    };
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(loop);
  }, [captureFrame, isLightMode]);

  const stopLoop = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const handleFile = (f: File) => {
    stopLoop();
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    activeRef.current = false;
    processingRef.current = false;
    lastCaptureRef.current = -1;
    lastDetectionRef.current = null;
    detMapRef.current.clear();
    allPlatesRef.current.clear();
    fpsWindow.current = [];
    setVideoUrl(URL.createObjectURL(f));
    setFile(f);
    setActive(false);
    setPaused(false);
    setUniquePlates(0);
    setFaceCount(0);
    setGunCount(0);
    setDetFps(0);
    setFeedFrames([]);
    setDroppedFrames(0);
  };

  const clear = () => {
    stopLoop();
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    activeRef.current = false;
    setFile(null);
    setVideoUrl(null);
    setActive(false);
    setPaused(false);
    setUniquePlates(0);
    setFaceCount(0);
    setGunCount(0);
    setDetFps(0);
    setFeedFrames([]);
    setDroppedFrames(0);
  };

  useEffect(
    () => () => {
      stopLoop();
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    },
    [],
  );

  const flushSession = useCallback(async (sid: string) => {
    try {
      await fetch(`/api/alpr/sessions/${sid}/flush`, { method: "POST" });
    } catch {
      /* ignore */
    }
  }, []);

  const startAnalysis = () => {
    const video = videoRef.current;
    if (!video) return;
    sessionIdRef.current = crypto.randomUUID();
    processingRef.current = false;
    lastCaptureRef.current = -1;
    lastDetectionRef.current = null;
    detMapRef.current.clear();
    allPlatesRef.current.clear();
    fpsWindow.current = [];
    setUniquePlates(0);
    setFaceCount(0);
    setGunCount(0);
    setDetFps(0);
    setFeedFrames([]);
    setDroppedFrames(0);
    activeRef.current = true;
    setActive(true);
    setPaused(false);
    video.currentTime = 0;
    video.play();
    startLoop();
  };

  const togglePause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setPaused(false);
    } else {
      video.pause();
      setPaused(true);
    }
  };

  const stopAnalysis = () => {
    activeRef.current = false;
    setActive(false);
    videoRef.current?.pause();
    if (sessionIdRef.current) {
      flushSession(sessionIdRef.current);
      sessionIdRef.current = null;
    }
  };

  const handleSeeked = () => {
    const video = videoRef.current;
    if (!video || detMapRef.current.size === 0) return;
    const t = video.currentTime;
    let best: DetectionResult | null = null,
      bestDiff = Infinity;
    for (const [vt, det] of detMapRef.current) {
      const d = Math.abs(t - vt);
      if (d < bestDiff) {
        bestDiff = d;
        best = det;
      }
    }
    lastDetectionRef.current = best;
    if (!rafRef.current && canvasRef.current && videoRef.current) {
      paintOverlay(canvasRef.current, videoRef.current, best, isLightMode);
    }
  };

  const boxBg = isLightMode
    ? "bg-white/50 border-slate-200 hover:bg-white/80"
    : "bg-[#0e1114]/40 border-[#222831] hover:bg-[#0e1114]/65";
  const subColor = isLightMode ? "text-slate-400" : "text-[#78899a]";
  const titleColor = isLightMode ? "#1D1D1F" : "#c8d0d8";
  const cardBg = isLightMode
    ? "bg-white border-slate-100"
    : "bg-[#0e1114] border-[#222831]";
  const selectBg = isLightMode
    ? "bg-white border-slate-100"
    : "bg-[#0e1114] border-[#222831]";

  return (
    <div className="space-y-5">
      {!videoUrl && (
        <div
          className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${boxBg}`}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <div
            className={`w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center shadow-sm ${
              isLightMode
                ? "bg-orange-50/50 text-[#FF9500]"
                : "bg-[#e8a000]/8 text-[#e8a000]"
            }`}
          >
            <Video size={28} />
          </div>
          <p className="text-lg font-bold" style={{ color: titleColor }}>
            Upload Video
          </p>
          <p className="text-sm mt-1" style={{ color: subColor }}>
            MP4, MOV, AVI · any length
          </p>
          <p
            className={`text-[11px] mt-4 font-medium max-w-xs mx-auto leading-relaxed ${subColor}`}
          >
            Frames are captured live in the browser and analysed as the video
            plays — no waiting for upload or batch processing
          </p>
        </div>
      )}

      {videoUrl && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">
          <div className="lg:col-span-3 space-y-4">
            <div
              className="relative rounded-2xl overflow-hidden bg-black shadow-2xl"
              style={{ aspectRatio: "16/9" }}
            >
              <video
                ref={videoRef}
                src={videoUrl}
                className="w-full h-full object-contain"
                playsInline
                onEnded={() => {
                  activeRef.current = false;
                  setActive(false);
                  setPaused(false);
                  if (sessionIdRef.current) {
                    flushSession(sessionIdRef.current);
                    sessionIdRef.current = null;
                  }
                }}
                onPause={() => setPaused(true)}
                onPlay={() => setPaused(false)}
                onSeeked={handleSeeked}
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none"
              />
              <canvas ref={captureRef} className="hidden" />

              {active && (
                <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/75 backdrop-blur-sm rounded-2xl px-3 py-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-white text-[11px] font-black tracking-widest">
                    LIVE
                  </span>
                  {detFps > 0 && (
                    <span className="text-white/55 text-[11px] font-bold">
                      {detFps} det/s
                    </span>
                  )}
                </div>
              )}
              {!active && detMapRef.current.size > 0 && (
                <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/75 backdrop-blur-sm rounded-2xl px-3 py-1.5">
                  <CheckCircle size={12} className="text-[#30D158]" />
                  <span className="text-white text-[11px] font-black">
                    Scrub to review
                  </span>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-3">
              <RegionSelect
                value={region}
                onChange={setRegion}
                disabled={active}
              />

              <div
                className={`relative flex rounded-2xl p-0.5 border ${selectBg}`}
              >
                {/* Sliding Pill */}
                <div
                  className={`absolute top-0.5 bottom-0.5 rounded-2xl transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] bg-[#0A7E8C]`}
                  style={{
                    width: "72px",
                    left:
                      captureMode === "fast"
                        ? "2px"
                        : captureMode === "balanced"
                          ? "74px"
                          : "146px",
                  }}
                />
                {(["fast", "balanced", "accurate"] as const).map((m) => {
                  const isActive = captureMode === m;
                  return (
                    <button
                      key={m}
                      onClick={() => setCaptureMode(m)}
                      disabled={active}
                      className="relative z-10 text-xs font-bold capitalize transition-colors duration-300 disabled:opacity-50 flex items-center justify-center"
                      style={{
                        width: "72px",
                        height: "32px",
                        color: isActive
                          ? isLightMode
                            ? "#fff"
                            : "#0a0c0e"
                          : isLightMode
                            ? "#8E8E93"
                            : "#78899a",
                      }}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>

              <label
                className="apple-switch flex items-center gap-2.5 text-sm select-none cursor-pointer font-semibold"
                title="Skip face & vehicle models per frame — much higher detection frame rate"
              >
                <input
                  type="checkbox"
                  checked={platesOnly}
                  disabled={active}
                  onChange={(e) => {
                    setPlatesOnly(e.target.checked);
                    platesOnlyRef.current = e.target.checked;
                  }}
                />
                <span className="apple-switch-slider" />
                <span className={titleColor}>Plates only</span>
              </label>

              {!active ? (
                <button
                  onClick={startAnalysis}
                  className={`flex items-center gap-2 px-6 h-10 min-w-[120px] justify-center text-sm font-bold rounded-2xl transition-all shadow-md text-white bg-[#FF9500] hover:bg-orange-600`}
                >
                  <Play size={15} fill="currentColor" />
                  {detMapRef.current.size > 0 ? "Re-analyze" : "Analyze"}
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={togglePause}
                    className="flex items-center gap-2 px-5 h-10 rounded-2xl text-sm font-bold text-white transition-colors"
                    style={{ background: paused ? "#30D158" : "#FF9500" }}
                  >
                    {paused ? (
                      <>
                        <Play size={14} fill="white" /> Resume
                      </>
                    ) : (
                      <>
                        <Pause size={14} /> Pause
                      </>
                    )}
                  </button>
                  <button
                    onClick={stopAnalysis}
                    className="flex items-center gap-2 px-5 h-10 rounded-2xl text-sm font-bold text-white bg-[#FF3B30] hover:bg-red-600 transition-colors"
                  >
                    <Square size={14} fill="white" /> Stop
                  </button>
                </div>
              )}

              <button
                onClick={clear}
                className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm border transition-colors ${
                  isLightMode
                    ? "bg-white border-slate-100 text-slate-400 hover:text-[#FF3B30]"
                    : "bg-[#0e1114] border-[#222831] text-[#78899a] hover:text-[#d93a3a]"
                }`}
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>

            {/* Stats */}
            {(active || detMapRef.current.size > 0) && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  {
                    label: "Unique Plates",
                    value: uniquePlates,
                    color: "#0A7E8C",
                  },
                  {
                    label: "Faces Detected",
                    value: faceCount,
                    color: "#30D158",
                  },
                  { label: "Gun Alerts", value: gunCount, color: "#FF3B30" },
                  {
                    label: "Dropped Frames",
                    value: droppedFrames,
                    color: "#FF9500",
                  },
                ].map((s) => (
                  <div
                    key={s.label}
                    className={`p-4 text-center rounded-2xl border ${cardBg}`}
                  >
                    <p
                      className="text-2xl font-black tabular-nums"
                      style={{ color: s.color }}
                    >
                      {s.value}
                    </p>
                    <p
                      className={`text-[10px] font-black uppercase tracking-widest mt-0.5 ${subColor}`}
                    >
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Legend */}
            {(active || detMapRef.current.size > 0) && (
              <div
                className={`flex flex-wrap items-center gap-4 px-4 py-3 rounded-2xl border ${
                  isLightMode
                    ? "bg-white/70 border-slate-100"
                    : "bg-[#0e1114] border-[#222831]"
                }`}
              >
                {[
                  {
                    color: "#0A7E8C",
                    label: "License Plate",
                  },
                  { color: "#30D158", label: "Face / Person" },
                  { color: "#FF9500", label: "Vehicle" },
                  { color: "#FF3B30", label: "Weapon" },
                ].map((l) => (
                  <div key={l.label} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded border-2 flex-shrink-0"
                      style={{
                        borderColor: l.color,
                        background: l.color + "22",
                      }}
                    />
                    <span className={`text-[11px] font-bold ${subColor}`}>
                      {l.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div className="lg:col-span-2 space-y-2 max-h-[620px] overflow-y-auto pr-1">
            <p
              className={`text-[10px] font-black uppercase tracking-widest sticky top-0 pt-1 pb-2 z-10 ${
                isLightMode
                  ? "bg-[#F2F2F7] text-slate-400"
                  : "bg-[#0a0c0e] text-[#78899a]"
              }`}
            >
              Detection Feed
            </p>

            {feedFrames.length === 0 && (
              <div
                className={`py-16 flex flex-col items-center justify-center rounded-2xl border ${cardBg}`}
              >
                {active ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse mb-3" />
                    <p className={`text-sm font-medium ${subColor}`}>
                      Scanning frames…
                    </p>
                  </>
                ) : (
                  <>
                    <Activity
                      size={22}
                      className={`mb-3 ${isLightMode ? "text-slate-200" : "text-[#3d4f5e]"}`}
                    />
                    <p className={`text-sm font-medium ${subColor}`}>
                      Press Analyze to start
                    </p>
                  </>
                )}
              </div>
            )}

            {feedFrames.map((frame, i) => (
              <div
                key={i}
                className={`rounded-2xl overflow-hidden border ${cardBg}`}
              >
                <div
                  className={`px-4 py-2 flex justify-between items-center border-b ${
                    isLightMode
                      ? "bg-slate-50/50 border-slate-100"
                      : "bg-[#12161a] border-[#222831]"
                  }`}
                >
                  <span
                    className={`text-[10px] font-black uppercase tracking-widest ${subColor}`}
                  >
                    {frame.videoTime.toFixed(2)}s
                  </span>
                  <span className="text-[10px] font-bold text-[#0A7E8C]">
                    {frame.processingTimeMs}ms
                  </span>
                </div>
                <div className="p-3 flex flex-wrap gap-2">
                  {frame.plates?.map((p, j) => (
                    <div
                      key={j}
                      className={`flex flex-col gap-1.5 rounded-2xl p-2 min-w-[100px] border ${
                        isLightMode
                          ? "bg-[#0A7E8C]/8 border-[#0A7E8C]/15"
                          : "bg-[#0A7E8C]/10 border-[#0A7E8C]/20 text-[#a5cdeb]"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`plate-badge text-[11px] px-2 py-0.5 ${isLightMode ? "" : "bg-[#0a0c0e] border border-[#222831]"}`}
                        >
                          {p.text}
                        </span>
                        <ConfBadge v={p.confidence} />
                      </div>
                      {p.thumbnail && (
                        <img
                          src={`data:image/jpeg;base64,${p.thumbnail}`}
                          alt={p.text}
                          className="w-full h-10 object-contain rounded bg-white"
                        />
                      )}
                      {(p as any).personName && (
                        <span className="text-[10px] font-bold truncate text-[#0A7E8C]">
                          ● {(p as any).personName}
                        </span>
                      )}
                    </div>
                  ))}
                  {frame.faces?.map((f: any, j) => (
                    <div
                      key={j}
                      className={`flex flex-col gap-1.5 rounded-2xl p-2 min-w-[80px] border ${
                        isLightMode
                          ? "bg-green-50 border-green-100"
                          : "bg-green-950/15 border-green-900/35 text-green-200"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isLightMode
                              ? "bg-green-100 text-green-600"
                              : "bg-green-900/20 text-green-400"
                          }`}
                        >
                          <User size={11} />
                        </div>
                        <span
                          className={`text-[11px] font-bold truncate ${isLightMode ? "text-green-900" : "text-green-200"}`}
                        >
                          {f.personName || "Unknown"}
                        </span>
                        <ConfBadge v={f.confidence} />
                        {f.spoofDetected && (
                          <span className="text-[9px] font-black text-[#FF3B30]">
                            SPOOF
                          </span>
                        )}
                      </div>
                      {f.thumbnail && (
                        <img
                          src={`data:image/jpeg;base64,${f.thumbnail}`}
                          alt="face"
                          className="w-full h-auto max-h-24 object-contain rounded bg-slate-900/5"
                        />
                      )}
                    </div>
                  ))}
                  {(frame as any).vehicles?.map((v: any, j: number) => (
                    <div
                      key={j}
                      className={`flex items-center gap-2 rounded-2xl px-2 py-1.5 border ${
                        isLightMode
                          ? "bg-orange-50 border-orange-100 text-orange-950"
                          : "bg-orange-950/15 border-orange-900/35 text-orange-200"
                      }`}
                    >
                      <Car
                        size={11}
                        className="text-orange-500 flex-shrink-0"
                      />
                      <span className="text-[11px] font-bold capitalize">
                        {[v.make, v.model].filter(Boolean).join(" ") ||
                          "Vehicle"}
                      </span>
                    </div>
                  ))}
                  {(frame as any).gunDetected && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-2xl px-2 py-1.5">
                      <AlertTriangle size={11} className="text-[#FF3B30]" />
                      <span className="text-[11px] font-black text-[#FF3B30]">
                        WEAPON
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Live Stream Detector Component ───────────────────────────────────────────
function LiveDetector() {
  const { isLightMode } = useTheme();
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [region, setRegion] = useState("NORTH_AMERICAN");
  const [streaming, setStreaming] = useState(false);
  const [frames, setFrames] = useState<
    Array<{
      plates: any[];
      faces: any[];
      frameIndex: number;
      processingTimeMs: number;
    }>
  >([]);

  const start = async () => {
    if (!url) return;
    setFrames([]);
    setStreaming(true);
    try {
      const res = await api.detectStream({
        url,
        region,
        maxPlates: 100,
        thumbnail: true,
        frameStep: 5,
      });
      if (!res.body) throw new Error("No response body");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const part of parts) {
          const lines = part.trim().split("\n");
          const ev = lines.find((l) => l.startsWith("event:"));
          const data = lines.find((l) => l.startsWith("data:"));
          if (!data) continue;
          const frame = JSON.parse(data.slice(5).trim());
          if (ev?.includes("error")) {
            throw new Error(frame.error);
          }
          if (ev?.includes("done")) {
            setStreaming(false);
            break;
          }
          if (frame.plates?.length > 0 || frame.faces?.length > 0)
            setFrames((f) => [frame, ...f.slice(0, 49)]);
        }
      }
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setStreaming(false);
    }
  };

  const cardBg = isLightMode
    ? "bg-white border-slate-100"
    : "bg-[#0e1114] border-[#222831]";
  const subColor = isLightMode ? "text-slate-400" : "text-[#78899a]";
  const inputStyle = isLightMode
    ? "text-slate-800 bg-slate-50 border-slate-100 focus:bg-white"
    : "text-[#c8d0d8] bg-[#0e1114] border-[#222831] focus:bg-[#12161a]";

  return (
    <div className="space-y-5">
      <div className={`p-6 space-y-4 rounded-2xl border ${cardBg}`}>
        <label
          className={`text-[11px] font-bold uppercase tracking-widest ${subColor}`}
        >
          Stream URL (RTSP / HTTP)
        </label>
        <input
          type="text"
          placeholder="rtsp://camera:554/live"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={streaming}
          className={`w-full rounded-2xl px-4 py-2.5 text-sm font-medium border outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${inputStyle}`}
        />
        <div className="flex items-center gap-3">
          <RegionSelect
            value={region}
            onChange={setRegion}
            disabled={streaming}
          />
          {streaming ? (
            <button
              onClick={() => setStreaming(false)}
              className="flex items-center gap-2 text-white px-6 h-10 rounded-2xl text-sm font-bold bg-red-500 hover:bg-red-600 transition-colors"
            >
              <Square size={14} fill="white" /> Stop
            </button>
          ) : (
            <button
              onClick={start}
              disabled={!url}
              className="flex items-center gap-2 px-8 h-10 text-sm font-bold rounded-2xl transition-all shadow-md text-white bg-[#0A7E8C] hover:bg-[#126180]"
            >
              <Play size={16} fill="currentColor" /> Connect
            </button>
          )}
        </div>
      </div>
      {streaming && (
        <div
          className={`rounded-2xl p-4 flex items-center gap-4 border ${
            isLightMode
              ? "bg-cyan-50 border-cyan-100 text-cyan-950"
              : "bg-cyan-950/20 border-cyan-900/30 text-cyan-200"
          }`}
        >
          <div className="live-ring" />
          <div>
            <p className="text-sm font-bold">Live Stream Active</p>
            <p
              className={`text-xs ${isLightMode ? "text-cyan-600" : "text-cyan-400/80"}`}
            >
              {frames.length} detection frames received
            </p>
          </div>
        </div>
      )}
      {frames.length > 0 && (
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
          {frames.map((frame, i) => (
            <div
              key={i}
              className={`overflow-hidden border rounded-2xl ${cardBg}`}
            >
              <div
                className={`px-4 py-2 flex justify-between border-b ${
                  isLightMode
                    ? "bg-slate-50/50 border-slate-100"
                    : "bg-[#12161a] border-[#222831]"
                }`}
              >
                <span className={`text-[10px] font-bold ${subColor}`}>
                  Frame {frame.frameIndex}
                </span>
                <span
                  className={`text-[10px] font-bold ${isLightMode ? "text-cyan-600" : "text-[#2db55d]"}`}
                >
                  {frame.processingTimeMs}ms
                </span>
              </div>
              <div className="p-3 flex flex-wrap gap-2">
                {frame.plates.map((p: any, j: number) => (
                  <div
                    key={j}
                    className={`flex items-center gap-2 border rounded-2xl pl-2 pr-3 py-1.5 shadow-sm ${
                      isLightMode
                        ? "bg-white border-slate-100"
                        : "bg-[#0a0c0e] border-[#222831]"
                    }`}
                  >
                    <span className="plate-badge text-xs">{p.text}</span>
                    <ConfBadge v={p.confidence} />
                  </div>
                ))}
                {frame.faces.map((f: any, j: number) => (
                  <div
                    key={j}
                    className={`flex items-center gap-2 border rounded-2xl px-3 py-1.5 shadow-sm ${
                      isLightMode
                        ? "bg-white border-slate-100"
                        : "bg-[#0a0c0e] border-[#222831]"
                    }`}
                  >
                    <User size={12} className="text-[#0A7E8C]" />
                    <span
                      className={`text-[11px] font-bold ${isLightMode ? "text-slate-800" : "text-[#c8d0d8]"}`}
                    >
                      {f.personName || "Unknown"}
                    </span>
                    <ConfBadge v={f.confidence} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DetectClient() {
  const { isLightMode } = useTheme();
  const [tab, setTab] = useState<"image" | "video" | "live">("image");
  const tabs = [
    { id: "image", label: "Image", icon: Upload },
    { id: "video", label: "Video", icon: Video },
    { id: "live", label: "Live Stream", icon: Activity },
  ] as const;

  const segmentBg = isLightMode
    ? "bg-slate-200/50 border border-slate-200/60"
    : "bg-[#181d22]/50 border border-[#222831]";

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <TopBar title="Detection" connected={tab === "live"} />
      <main className="flex-1 p-6 w-full mx-auto overflow-y-auto">
        <div
          className={`mx-auto space-y-6 transition-all ${tab === "live" ? "max-w-4xl" : "max-w-6xl"}`}
        >
          <div
            className={`relative flex p-1 backdrop-blur-md rounded-2xl w-fit mx-auto shadow-sm ${segmentBg}`}
          >
            {/* Sliding Pill */}
            <div
              className={`absolute top-1 bottom-1 rounded-2xl transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] ${
                isLightMode
                  ? "bg-white shadow-sm border border-transparent"
                  : "bg-[#222831] border border-[#222831]"
              }`}
              style={{
                width: "136px",
                left:
                  tab === "image" ? "4px" : tab === "video" ? "140px" : "276px",
              }}
            />
            {tabs.map((t) => {
              const active = tab === t.id;
              const activeColor = "text-[#0A7E8C]";
              const inactiveColor = isLightMode
                ? "text-slate-400 hover:text-slate-600"
                : "text-[#78899a] hover:text-[#c8d0d8]";
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id as any)}
                  className={`relative z-10 py-2 rounded-2xl text-sm font-bold flex items-center justify-center gap-2.5 transition-colors duration-300 ${active ? activeColor : inactiveColor}`}
                  style={{ width: "136px" }}
                >
                  <t.icon size={15} strokeWidth={active ? 2.5 : 2} />
                  {t.label}
                </button>
              );
            })}
          </div>
          <div
            key={tab}
            className="animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            {tab === "image" ? (
              <ImageDetector />
            ) : tab === "video" ? (
              <VideoDetector />
            ) : (
              <LiveDetector />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
