// node --test src/photo.test.mjs   (Node 24 strips types natively)
import assert from "node:assert/strict";
import test from "node:test";
import { calibrationProblem, estimateGrams, fitCalibration, segment } from "./photo.ts";

const W = 200;
const H = 150;
const ROI = { cx: 0.5, cy: 0.5, r: 0.42 };

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

/** Steel-grey plate on a darker table; `food` is a list of discs [cx, cy, r] in pixels. */
function render({ food = [], gain = 1, plate = 150, rice = 232, seed = 1 }) {
  const rand = rng(seed);
  const data = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const dx = x - W / 2;
      const dy = y - H / 2;
      let v = dx * dx + dy * dy <= (0.45 * H) ** 2 ? plate : 60;
      for (const [fx, fy, fr] of food) if ((x - fx) ** 2 + (y - fy) ** 2 <= fr * fr) v = rice;
      v = v * gain + (rand() - 0.5) * 8;
      data[i] = v;
      data[i + 1] = v * 1.01;
      data[i + 2] = v * 1.03;
      data[i + 3] = 255;
    }
  }
  return { width: W, height: H, data };
}
/** A mound of the given share of the region, centred off-axis. */
const mound = (share) => {
  const rr = ROI.r * H;
  const r = Math.sqrt(share) * rr;
  return [[W / 2 + 0.2 * rr, H / 2 - 0.1 * rr, r]];
};
const truth = (share) => 260 * Math.pow(share, 1.3);

const ref = render({ seed: 1 });

test("an empty plate has no coverage, even under different light", () => {
  assert.equal(segment(ref, render({ seed: 2 }), ROI).coverage, 0);
  const dim = segment(ref, render({ seed: 3, gain: 0.88 }), ROI);
  assert.equal(dim.coverage, 0);
});

test("coverage tracks the covered share and is monotone", () => {
  let last = -1;
  for (const share of [0.05, 0.12, 0.25, 0.4, 0.6]) {
    const s = segment(ref, render({ food: mound(share), seed: 7 }), ROI);
    assert.ok(Math.abs(s.coverage - share) < 0.04, `share ${share} read as ${s.coverage}`);
    assert.ok(s.coverage > last);
    assert.ok(!s.flags.includes("low_contrast"));
    last = s.coverage;
  }
});

test("exposure change is compensated using the plate rim", () => {
  const s = segment(ref, render({ food: mound(0.3), gain: 0.9, seed: 9 }), ROI);
  assert.ok(Math.abs(s.coverage - 0.3) < 0.05, `read ${s.coverage}`);
  assert.ok(s.gain[0] < 0.95);
});

test("calibration on weighed plates predicts held-out plates within its stated uncertainty", () => {
  const shares = [0.06, 0.14, 0.24, 0.36, 0.5];
  const pts = shares.map((sh, k) => ({ coverage: segment(ref, render({ food: mound(sh), seed: 20 + k }), ROI).coverage, grams: truth(sh) }));
  const fit = fitCalibration(pts);
  assert.ok(fit && fit.n === 5 && fit.rmse_g !== null);
  assert.ok(Math.abs(fit.p - 1.3) < 0.25, `exponent ${fit.p}`);
  for (const sh of [0.1, 0.3, 0.45]) {
    const c = segment(ref, render({ food: mound(sh), seed: 40 }), ROI).coverage;
    const est = estimateGrams(fit, c);
    assert.ok(Math.abs(est.grams - truth(sh)) <= Math.max(est.sd_g * 2, 8), `${sh}: ${est.grams} vs ${truth(sh)} sd ${est.sd_g}`);
  }
  assert.deepEqual(estimateGrams(fit, 0), { grams: 0, sd_g: 5 });
});

test("a food that barely differs from the plate is flagged, not trusted", () => {
  const s = segment(ref, render({ food: mound(0.4), rice: 172, seed: 11 }), ROI);
  assert.ok(s.flags.includes("low_contrast") || s.coverage === 0, JSON.stringify({ c: s.coverage, f: s.flags, k: s.contrast }));
});

test("food invisible against the plate is caught when calibrating, not silently read as empty", () => {
  const s = segment(ref, render({ food: mound(0.4), rice: 158, seed: 12 }), ROI);
  assert.equal(s.coverage, 0);
  assert.match(calibrationProblem(80, s), /No food was detected/);
  assert.equal(calibrationProblem(0, s), null);
  const ok = segment(ref, render({ food: mound(0.4), seed: 13 }), ROI);
  assert.equal(calibrationProblem(80, ok), null);
});

test("with fewer than three points the fit is proportional and its uncertainty is wide", () => {
  const fit = fitCalibration([{ coverage: 0.2, grams: 60 }]);
  assert.equal(fit.p, 1);
  assert.equal(fit.rmse_g, null);
  const e = estimateGrams(fit, 0.2);
  assert.equal(e.grams, 60);
  assert.ok(e.sd_g >= 15);
});

test("mismatched frame sizes are rejected", () => {
  assert.throws(() => segment(ref, { width: 10, height: 10, data: new Uint8ClampedArray(400) }, ROI));
});
