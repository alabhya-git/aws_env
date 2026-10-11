// Photo-assisted leftover estimate. Plain image arithmetic, no model download.
//
// Method: with the camera fixed over the return station, photograph the empty
// plate once (reference). A later photo of the same plate is compared with it
// pixel by pixel inside a circular region; pixels that changed are food. The
// share of the plate they cover is mapped to grams by a curve fitted to photos
// of plates the operator weighed. The result is an estimate with a stated
// uncertainty, labelled "photo estimate"; a scale reading always overrides it.
//
// Photos are processed on the device. Only the resulting number is sent.

export interface Frame {
  width: number;
  height: number;
  data: Uint8ClampedArray; // RGBA
}
/** Plate region as fractions: centre of width/height, radius of the shorter side. */
export interface Roi {
  cx: number;
  cy: number;
  r: number;
}
export type Flag = "low_contrast" | "lighting_changed" | "plate_full" | "plate_outside_region";

export interface Segmentation {
  coverage: number; // share of the region that changed, 0..1
  mask: Uint8Array; // 1 where food was detected (width*height)
  threshold: number;
  contrast: number; // mean change of detected pixels, 0..441
  gain: [number, number, number];
  regionPixels: number;
  flags: Flag[];
}

const FLOOR = 26; // below this a change is indistinguishable from sensor noise and shadow flicker
const CEIL = 90;

function inRegion(W: number, H: number, roi: Roi) {
  const cx = roi.cx * W;
  const cy = roi.cy * H;
  const r = roi.r * Math.min(W, H);
  return { cx, cy, r, r2: r * r, rim2: (0.82 * r) * (0.82 * r) };
}

function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[s.length >> 1];
}

function otsu(hist: number[], total: number): number {
  let sum = 0;
  for (let i = 0; i < hist.length; i++) sum += i * hist[i];
  let wB = 0;
  let sumB = 0;
  let best = 0;
  let bestT = 0;
  for (let t = 0; t < hist.length; t++) {
    wB += hist[t];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const v = wB * wF * (mB - mF) * (mB - mF);
    if (v > best) {
      best = v;
      bestT = t;
    }
  }
  return bestT;
}

export function segment(reference: Frame, photo: Frame, roi: Roi): Segmentation {
  if (reference.width !== photo.width || reference.height !== photo.height) {
    throw new Error("reference and photo must be the same size");
  }
  const { width: W, height: H } = photo;
  const g = inRegion(W, H, roi);
  const R = reference.data;
  const T = photo.data;

  // exposure change between the two shots, from the plate's outer rim (usually clear of food)
  const ratio: number[][] = [[], [], []];
  const all: number[][] = [[], [], []];
  let regionPixels = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = x - g.cx;
      const dy = y - g.cy;
      const d2 = dx * dx + dy * dy;
      if (d2 > g.r2) continue;
      regionPixels++;
      const i = (y * W + x) * 4;
      for (let c = 0; c < 3; c++) {
        const q = (T[i + c] + 1) / (R[i + c] + 1);
        all[c].push(q);
        if (d2 >= g.rim2) ratio[c].push(q);
      }
    }
  }
  const clamp = (v: number) => Math.min(1.6, Math.max(0.6, v));
  const gain: [number, number, number] = [0, 1, 2].map((c) => clamp(median(ratio[c].length > 30 ? ratio[c] : all[c]) || 1)) as [number, number, number];

  const dist = new Float32Array(W * H);
  const hist = new Array(256).fill(0);
  const ringD: number[] = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = x - g.cx;
      const dy = y - g.cy;
      const d2 = dx * dx + dy * dy;
      if (d2 > g.r2) continue;
      const i = (y * W + x) * 4;
      let s = 0;
      for (let c = 0; c < 3; c++) {
        const v = T[i + c] / gain[c] - R[i + c];
        s += v * v;
      }
      const d = Math.sqrt(s);
      dist[y * W + x] = d;
      hist[Math.min(255, Math.round(d))]++;
      if (d2 >= g.rim2) ringD.push(d);
    }
  }
  const noise = median(ringD);
  const t = Math.min(CEIL, Math.max(FLOOR, 4 * noise, otsu(hist, regionPixels)));

  // 3x3 majority filter removes isolated specks
  const raw = new Uint8Array(W * H);
  for (let i = 0; i < raw.length; i++) raw[i] = dist[i] > t ? 1 : 0;
  const mask = new Uint8Array(W * H);
  let fg = 0;
  let contrastSum = 0;
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const dx = x - g.cx;
      const dy = y - g.cy;
      if (dx * dx + dy * dy > g.r2) continue;
      let n = 0;
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) n += raw[(y + oy) * W + x + ox];
      if (n >= 5) {
        mask[y * W + x] = 1;
        fg++;
        contrastSum += dist[y * W + x];
      }
    }
  }
  const coverage = regionPixels ? fg / regionPixels : 0;
  const contrast = fg ? contrastSum / fg : 0;
  const flags: Flag[] = [];
  const shift = Math.max(...gain.map((v) => Math.abs(v - 1)));
  if (shift > 0.25) flags.push("lighting_changed");
  if (coverage > 0.02 && contrast < 45) flags.push("low_contrast");
  if (coverage > 0.97) flags.push("plate_full");
  if (g.cx < 0 || g.cy < 0 || g.cx > W || g.cy > H || g.r > Math.min(W, H) * 0.75) flags.push("plate_outside_region");
  return { coverage: coverage < 0.004 ? 0 : coverage, mask, threshold: t, contrast, gain, regionPixels, flags };
}

// ---------------------------------------------------------------- calibration
export interface CalPoint {
  coverage: number;
  grams: number;
}
export interface Fit {
  k: number;
  p: number; // grams = k * coverage^p
  n: number;
  rmse_g: number | null; // leave-one-out, needs at least 3 points
}

function fitPower(points: CalPoint[]): { k: number; p: number } | null {
  const pts = points.filter((q) => q.coverage > 0.003 && q.grams > 0);
  if (!pts.length) return null;
  if (pts.length < 3) {
    // too few points to fit a curve: grams proportional to covered area
    const k = pts.reduce((s, q) => s + q.coverage * q.grams, 0) / pts.reduce((s, q) => s + q.coverage * q.coverage, 0);
    return { k, p: 1 };
  }
  const xs = pts.map((q) => Math.log(q.coverage));
  const ys = pts.map((q) => Math.log(q.grams));
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < xs.length; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) * (xs[i] - mx);
  }
  const p = Math.min(2, Math.max(0.6, sxx > 1e-9 ? sxy / sxx : 1));
  const lnk = my - p * mx;
  return { k: Math.exp(lnk), p };
}

export function fitCalibration(points: CalPoint[]): Fit | null {
  const f = fitPower(points);
  if (!f) return null;
  const usable = points.filter((q) => q.coverage > 0.003 && q.grams > 0);
  let rmse: number | null = null;
  if (usable.length >= 3) {
    let se = 0;
    for (let i = 0; i < usable.length; i++) {
      const rest = usable.filter((_, j) => j !== i);
      const fi = fitPower(rest);
      if (!fi) continue;
      const pred = fi.k * Math.pow(usable[i].coverage, fi.p);
      se += (pred - usable[i].grams) ** 2;
    }
    rmse = Math.sqrt(se / usable.length);
  }
  return { ...f, n: usable.length, rmse_g: rmse };
}

export function estimateGrams(fit: Fit, coverage: number): { grams: number; sd_g: number } {
  if (coverage <= 0) return { grams: 0, sd_g: 5 };
  const g = fit.k * Math.pow(coverage, fit.p);
  const sd = fit.rmse_g === null ? Math.max(8, 0.25 * g) : Math.sqrt(fit.rmse_g ** 2 + (0.1 * g) ** 2);
  return { grams: Math.round(g), sd_g: Math.max(5, Math.round(sd)) };
}

/** A weighed plate with food on it that reads as empty means the camera cannot see this food on this plate. */
export function calibrationProblem(grams: number, seg: Segmentation): string | null {
  if (grams >= 15 && seg.coverage < 0.01) {
    return "No food was detected on a plate you say holds " + grams + " g. The food does not stand out from this plate, so photo estimates would read it as empty. Use a plate that contrasts with the food, or weigh instead.";
  }
  if (seg.flags.includes("lighting_changed")) return "The light differs a lot from the empty-plate photo. Retake both under the same light.";
  return null;
}

export const FLAG_TEXT: Record<Flag, string> = {
  low_contrast: "The food is hard to tell from the plate in this photo. Weigh it instead, or use a plate that contrasts with the food.",
  lighting_changed: "The light changed a lot since the empty-plate photo. The estimate is less reliable; retake the reference if this is the new normal.",
  plate_full: "The plate is almost entirely covered, where area stops telling amount well. Weigh it.",
  plate_outside_region: "The circle is not on the plate. Move and resize it to match the plate rim.",
};
