import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWs } from "../App";
import { CalPoint, calibrationProblem, estimateGrams, FLAG_TEXT, fitCalibration, Frame, Roi, segment, Segmentation } from "../photo";

const KEY = "proofplate.photo.v1";
const WIDTH = 320;
const DEFAULT_ROI: Roi = { cx: 0.5, cy: 0.51, r: 0.45 };

interface Store {
  reference: string | null; // JPEG data URL of the empty plate, kept on this device only
  size: [number, number] | null;
  roi: Roi;
  points: CalPoint[];
  source: "camera" | "generated" | null;
}
const EMPTY: Store = { reference: null, size: null, roi: DEFAULT_ROI, points: [], source: null };

function loadStore(): Store {
  try {
    return { ...EMPTY, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return EMPTY;
  }
}
function saveStore(s: Store): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable: the setup lasts until the page closes */
  }
}

function toFrame(src: CanvasImageSource, w: number, h: number): { frame: Frame; canvas: HTMLCanvasElement } {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(src, 0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h);
  return { frame: { width: w, height: h, data: img.data }, canvas };
}

async function bitmapOf(file: Blob): Promise<ImageBitmap> {
  return createImageBitmap(file);
}

async function frameOfDataUrl(url: string, size: [number, number]): Promise<Frame> {
  const blob = await (await fetch(url)).blob();
  const bmp = await bitmapOf(blob);
  return toFrame(bmp, size[0], size[1]).frame;
}

type Mode = "measure" | "reference" | "calibrate";
const MODE_TEXT: Record<Mode, string> = { measure: "Measure leftovers", reference: "Empty-plate photo", calibrate: "Calibrate with a weighed plate" };

export function PhotoMeter({ onUse }: { onUse: (grams: number, sd: number) => void }) {
  const { mode: ws } = useWs();
  const [store, setStoreState] = useState<Store>(loadStore);
  const [mode, setMode] = useState<Mode>(store.reference ? (store.points.length ? "measure" : "calibrate") : "reference");
  const [ref, setRef] = useState<Frame | null>(null);
  const [photo, setPhoto] = useState<{ frame: Frame; canvas: HTMLCanvasElement } | null>(null);
  const [seg, setSeg] = useState<Segmentation | null>(null);
  const [known, setKnown] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const view = useRef<HTMLCanvasElement>(null);

  const setStore = useCallback((fn: (s: Store) => Store) => {
    setStoreState((s) => {
      const n = fn(s);
      saveStore(n);
      return n;
    });
  }, []);

  useEffect(() => {
    let live = true;
    if (!store.reference || !store.size) return setRef(null);
    frameOfDataUrl(store.reference, store.size).then((f) => live && setRef(f)).catch(() => live && setRef(null));
    return () => {
      live = false;
    };
  }, [store.reference, store.size]);

  useEffect(() => {
    if (!photo || !ref || mode === "reference") return setSeg(null);
    try {
      setSeg(segment(ref, photo.frame, store.roi));
    } catch {
      setSeg(null);
    }
  }, [photo, ref, store.roi, mode]);

  // preview with the detected food tinted amber and the plate region outlined
  useEffect(() => {
    const c = view.current;
    if (!c || !photo) return;
    const { width: w, height: h } = photo.frame;
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(photo.canvas, 0, 0);
    if (seg) {
      const img = ctx.getImageData(0, 0, w, h);
      for (let i = 0; i < seg.mask.length; i++) {
        if (seg.mask[i]) {
          img.data[i * 4] = img.data[i * 4] * 0.45 + 233 * 0.55;
          img.data[i * 4 + 1] = img.data[i * 4 + 1] * 0.45 + 185 * 0.55;
          img.data[i * 4 + 2] = img.data[i * 4 + 2] * 0.45 + 73 * 0.55;
        }
      }
      ctx.putImageData(img, 0, 0);
    }
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.arc(store.roi.cx * w, store.roi.cy * h, store.roi.r * Math.min(w, h), 0, Math.PI * 2);
    ctx.stroke();
  }, [photo, seg, store.roi]);

  useEffect(() => () => stopCam(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const fit = useMemo(() => (store.points.length ? fitCalibration(store.points) : null), [store.points]);
  const est = seg && fit ? estimateGrams(fit, seg.coverage) : null;

  async function ingest(blob: Blob) {
    setBusy(true);
    setNote(null);
    try {
      const bmp = await bitmapOf(blob);
      if (mode === "reference") {
        const size: [number, number] = [WIDTH, Math.round((WIDTH * bmp.height) / bmp.width)];
        const { canvas } = toFrame(bmp, size[0], size[1]);
        setStore((s) => ({ ...s, reference: canvas.toDataURL("image/jpeg", 0.85), size, points: [], source: "camera" }));
        setPhoto({ frame: toFrame(bmp, size[0], size[1]).frame, canvas });
        setMode("calibrate");
        setNote("Empty plate saved on this device. Calibration points from an earlier reference were cleared. Next: photograph plates with a known weight.");
        return;
      }
      if (!store.size || !ref) {
        setNote("Take the empty-plate photo first.");
        return;
      }
      setPhoto(toFrame(bmp, store.size[0], store.size[1]));
    } catch {
      setNote("That image could not be read. Try a JPEG or PNG photo.");
    } finally {
      setBusy(false);
    }
  }

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) void ingest(f);
  };

  async function startCam() {
    setNote(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      stream.current = s;
      setCamOn(true);
      requestAnimationFrame(() => {
        if (video.current) {
          video.current.srcObject = s;
          void video.current.play();
        }
      });
    } catch {
      setNote("The camera is not available here. Use “Choose a photo” instead.");
    }
  }
  function stopCam() {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setCamOn(false);
  }
  function snap() {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d")!.drawImage(v, 0, 0);
    c.toBlob((b) => b && void ingest(b), "image/jpeg", 0.9);
    stopCam();
  }

  async function loadSamples() {
    setBusy(true);
    setNote(null);
    try {
      const base = "/samples/photos/";
      const m = await (await fetch(base + "manifest.json")).json();
      const fetchBitmap = async (f: string) => bitmapOf(await (await fetch(base + f)).blob());
      const rb = await fetchBitmap(m.reference);
      const size: [number, number] = [WIDTH, Math.round((WIDTH * rb.height) / rb.width)];
      const refF = toFrame(rb, size[0], size[1]);
      const pts: CalPoint[] = [];
      for (const c of m.calibration) {
        const f = toFrame(await fetchBitmap(c.file), size[0], size[1]);
        const sg = segment(refF.frame, f.frame, DEFAULT_ROI);
        pts.push({ coverage: sg.coverage, grams: c.grams });
      }
      setStore(() => ({ reference: refF.canvas.toDataURL("image/jpeg", 0.85), size, roi: DEFAULT_ROI, points: pts, source: "generated" }));
      setMode("measure");
      setPhoto(null);
      setNote("Loaded a generated empty plate and five generated weighed plates. These are rendered demonstration images, not real food.");
    } catch {
      setNote("The sample photos could not be loaded.");
    } finally {
      setBusy(false);
    }
  }
  async function loadTest(file: string) {
    const blob = await (await fetch("/samples/photos/" + file)).blob();
    setMode("measure");
    await ingest(blob);
  }

  const addPoint = () => {
    const g = Number(known);
    if (!seg || !Number.isFinite(g) || g <= 0) return;
    const problem = calibrationProblem(g, seg);
    if (problem) return setNote(problem);
    setStore((s) => ({ ...s, points: [...s.points, { coverage: seg.coverage, grams: Math.round(g) }] }));
    setKnown("");
    setPhoto(null);
    setNote(`Added ${Math.round(g)} g at ${(seg.coverage * 100).toFixed(0)}% covered.`);
  };

  const roiSlider = (k: keyof Roi, label: string, min: number, max: number) => (
    <label className="field" key={k}>
      <span>{label}</span>
      <input type="range" min={min} max={max} step={0.005} value={store.roi[k]} style={{ accentColor: "var(--scale)" }}
        onChange={(e) => setStore((s) => ({ ...s, roi: { ...s.roi, [k]: Number(e.target.value) } }))} />
    </label>
  );

  const ready = !!store.reference;
  return (
    <div className="photo stack">
      <p className="small muted">
        Photos are analysed on this device and are not uploaded. Only the estimated grams and its uncertainty are saved, labelled as a photo estimate.
        Works best from a fixed camera position over a plate that contrasts with the food. A scale reading always takes priority.
      </p>

      <div className="photo-steps small">
        <span className={ready ? "done" : "now"}>1. Empty plate {ready ? (store.source === "generated" ? "(generated)" : "saved") : "needed"}</span>
        <span className={store.points.length >= 3 ? "done" : ready ? "now" : ""}>
          2. Weighed plates: {store.points.length}{store.points.length < 3 ? " (3 or more recommended)" : ""}
        </span>
        <span className={fit ? "done" : ""}>
          3. {fit ? `Typical error ${fit.rmse_g === null ? "not known yet" : "±" + Math.round(fit.rmse_g) + " g"}` : "Measure"}
        </span>
      </div>

      <div className="row">
        <div className="seg" role="group" aria-label="What this photo is">
          {(Object.keys(MODE_TEXT) as Mode[]).map((m) => (
            <button key={m} type="button" aria-pressed={mode === m} disabled={m !== "reference" && !ready}
              onClick={() => { setMode(m); setPhoto(null); setNote(null); }}>
              {MODE_TEXT[m]}
            </button>
          ))}
        </div>
      </div>

      <div className="row">
        <label className="btn">
          Choose a photo
          <input type="file" accept="image/*" capture="environment" className="sr" onChange={onFile} aria-label="Choose a photo" />
        </label>
        {camOn ? (
          <>
            <button type="button" className="btn primary" onClick={snap}>Take photo</button>
            <button type="button" className="btn ghost" onClick={stopCam}>Close camera</button>
          </>
        ) : (
          <button type="button" className="btn" onClick={startCam}>Use camera</button>
        )}
        {ws === "demo" ? <button type="button" className="btn ghost" disabled={busy} onClick={loadSamples}>Load generated sample photos</button> : null}
      </div>
      {camOn ? <video ref={video} className="photo-video" playsInline muted aria-label="Camera preview" /> : null}

      {ready && ws === "demo" && store.source === "generated" ? (
        <div className="row small">
          <span className="muted">Try a generated return photo:</span>
          {["return-1.jpg|Empty plate", "return-2.jpg|A little left", "return-3.jpg|About a scoop left", "return-4.jpg|A lot left"].map((x) => {
            const [f, l] = x.split("|");
            return <button key={f} type="button" className="btn sm" onClick={() => loadTest(f)}>{l}</button>;
          })}
        </div>
      ) : null}

      {note ? <div className="note" role="status">{note}</div> : null}

      {photo ? (
        <div className="photo-work">
          <div>
            <canvas ref={view} className="photo-canvas" role="img" aria-label="Photo with detected food highlighted" />
            <div className="grid cols-3 photo-roi">
              {roiSlider("cx", "Plate centre, left–right", 0.2, 0.8)}
              {roiSlider("cy", "Plate centre, up–down", 0.2, 0.8)}
              {roiSlider("r", "Plate size", 0.15, 0.7)}
            </div>
            <p className="small muted">Match the dashed circle to the plate rim. Amber is what the camera sees as food.</p>
          </div>
          <div className="stack">
            {mode === "measure" && seg ? (
              <>
                <div className="readout">
                  <span className="small muted">Leftovers, from this photo</span>
                  <span className="figure">{est ? `${est.grams} g` : `${(seg.coverage * 100).toFixed(0)}% covered`}</span>
                  <span className="small">{est ? `± ${est.sd_g} g · ${(seg.coverage * 100).toFixed(0)}% of the plate covered` : "Add weighed plates to turn coverage into grams."}</span>
                </div>
                {seg.flags.map((f) => <div key={f} className="note amber">{FLAG_TEXT[f]}</div>)}
                <button type="button" className="btn primary" disabled={!est || seg.flags.includes("plate_outside_region")} onClick={() => est && onUse(est.grams, est.sd_g)}>
                  {est ? `Use ${est.grams} g as the returned amount` : "Needs calibration first"}
                </button>
              </>
            ) : null}
            {mode === "calibrate" && seg ? (
              <>
                <div className="readout">
                  <span className="small muted">This plate</span>
                  <span className="figure">{(seg.coverage * 100).toFixed(0)}% covered</span>
                </div>
                {seg.flags.map((f) => <div key={f} className="note amber">{FLAG_TEXT[f]}</div>)}
                <label className="field">
                  <span>Weight of food on this plate (grams, from the scale)</span>
                  <input className="input num" inputMode="numeric" value={known} style={{ maxWidth: 160 }}
                    onChange={(e) => setKnown(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))} />
                </label>
                <div><button type="button" className="btn primary" disabled={!known} onClick={addPoint}>Add as a calibration point</button></div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      {store.points.length ? (
        <details>
          <summary className="small" style={{ cursor: "pointer" }}>Calibration points ({store.points.length}){fit ? ` · grams ≈ ${fit.k.toFixed(0)} × coverage^${fit.p.toFixed(2)}` : ""}</summary>
          <table className="t" style={{ marginTop: 8 }}>
            <thead><tr><th className="r">Covered</th><th className="r">Weighed</th><th /></tr></thead>
            <tbody>
              {store.points.map((p, i) => (
                <tr key={i}>
                  <td className="r">{(p.coverage * 100).toFixed(1)}%</td>
                  <td className="r">{p.grams} g</td>
                  <td className="r"><button type="button" className="btn sm ghost" onClick={() => setStore((s) => ({ ...s, points: s.points.filter((_, j) => j !== i) }))}>Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="row" style={{ marginTop: 8 }}>
            <button type="button" className="btn sm ghost danger" onClick={() => { setStoreState(EMPTY); saveStore(EMPTY); setPhoto(null); setMode("reference"); }}>Clear this device's photo setup</button>
          </div>
        </details>
      ) : null}
    </div>
  );
}
