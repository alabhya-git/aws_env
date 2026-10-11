"""Render the generated demonstration photos used by the demo's photo estimate.

These are RENDERED images, not photographs of real food. They exist so the
demo's photo feature can be tried without a camera and a plate of rice. A real
camera works the same way: see apps/web/src/photo.ts.

    python scripts/make_sample_photos.py
"""
from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = Path(__file__).resolve().parents[1] / "apps" / "web" / "public" / "samples" / "photos"
W, H = 480, 360
CX, CY, PR = W / 2, H / 2 + 4, 150        # plate centre and radius in pixels
REGION_R = 0.45 * H                         # the app's default circle
SEED = 20261011


def table(rng: np.random.Generator) -> np.ndarray:
    y, x = np.mgrid[0:H, 0:W]
    grain = 0.5 + 0.5 * np.sin(x / 9.0 + 3.0 * np.sin(y / 41.0) + 0.9 * np.sin(x / 57.0))
    base = np.stack([88 + 26 * grain, 64 + 20 * grain, 42 + 14 * grain], axis=-1)
    return base + rng.normal(0, 2.0, (H, W, 3))


def plate(img: Image.Image) -> None:
    d = ImageDraw.Draw(img)
    d.ellipse([CX - PR - 6, CY - PR - 2, CX + PR + 6, CY + PR + 10], fill=(40, 30, 22))   # soft contact shadow
    d.ellipse([CX - PR, CY - PR, CX + PR, CY + PR], fill=(150, 156, 160))               # stainless thali
    d.ellipse([CX - PR + 14, CY - PR + 14, CX + PR - 14, CY + PR - 14], fill=(142, 148, 153))
    d.ellipse([CX - PR + 40, CY - PR + 40, CX + PR - 40, CY + PR - 40], outline=(160, 166, 170), width=2)


def rice(img: Image.Image, mask: Image.Image, area_frac: float, rng: np.random.Generator) -> None:
    """Cooked-rice mound(s) aiming at the given share of the circular region.
    The mound footprint is also drawn into `mask`, which is how the true area is measured."""
    if area_frac <= 0:
        return
    d = ImageDraw.Draw(img)
    md = ImageDraw.Draw(mask)
    target = area_frac * math.pi * REGION_R ** 2
    n = 1 if area_frac < 0.12 else 2 if area_frac < 0.3 else 3
    for k in range(n):
        r = math.sqrt(target / n / math.pi)
        ang = rng.uniform(0, 2 * math.pi)
        off = 0.0 if n == 1 else r * 0.7
        mx, my = CX + 0.15 * REGION_R + off * math.cos(ang + k * 2.1), CY - 0.05 * REGION_R + off * math.sin(ang + k * 2.1)
        d.ellipse([mx - r - 3, my - r + 3, mx + r + 3, my + r + 6], fill=(112, 116, 118))  # shadow
        d.ellipse([mx - r, my - r, mx + r, my + r], fill=(236, 232, 218))
        md.ellipse([mx - r, my - r, mx + r, my + r], fill=255)
        d.ellipse([mx - 0.6 * r, my - 0.7 * r, mx + 0.35 * r, my + 0.2 * r], fill=(246, 244, 235))  # highlight
        for _ in range(int(r * r / 5)):                                                           # grains
            gx, gy = mx + rng.uniform(-r, r), my + rng.uniform(-r, r)
            if (gx - mx) ** 2 + (gy - my) ** 2 < r * r:
                c = int(rng.uniform(214, 252))
                d.ellipse([gx - 1.6, gy - 0.9, gx + 1.6, gy + 0.9], fill=(c, c - 3, c - 14))


def region_share(mask: Image.Image) -> float:
    """Share of the app's default circular region that is actually covered by rice."""
    yy, xx = np.mgrid[0:H, 0:W]
    inside = (xx - 0.5 * W) ** 2 + (yy - 0.51 * H) ** 2 <= REGION_R ** 2
    return float(((np.asarray(mask) > 0) & inside).sum() / inside.sum())


def render(area_frac: float, seed: int, gain: float = 1.0) -> tuple[Image.Image, float]:
    rng = np.random.default_rng(seed)
    img = Image.fromarray(np.clip(table(rng), 0, 255).astype("uint8"))
    mask = Image.new("L", (W, H), 0)
    plate(img)
    rice(img, mask, area_frac, rng)
    arr = np.asarray(img.filter(ImageFilter.GaussianBlur(0.6))).astype(float) * gain
    arr += rng.normal(0, 2.5, arr.shape)
    return Image.fromarray(np.clip(arr, 0, 255).astype("uint8")), region_share(mask)


# ground truth: grams on the plate for the MEASURED rendered area, mass ~ area^1.35 (an assumption of this generator)
def grams_for(share: float) -> int:
    return int(round(310 * share ** 1.35))


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = {
        "status": "GENERATED",
        "note": "Rendered demonstration images, not photographs of real food. Mass is a function of rendered area chosen by the generator.",
        "seed": SEED,
        "reference": "empty.jpg",
        "calibration": [],
        "tests": [],
    }
    render(0.0, SEED)[0].save(OUT / "empty.jpg", quality=88)
    for i, aim in enumerate([0.05, 0.11, 0.2, 0.32, 0.46]):
        img, share = render(aim, SEED + 10 + i, gain=1.0)
        g = grams_for(share)
        name = f"plate-{g}g.jpg"
        img.save(OUT / name, quality=88)
        manifest["calibration"].append({"file": name, "grams": g, "rendered_share": round(share, 4)})
    for i, (aim, gain, label) in enumerate([(0.0, 0.97, "Empty plate"), (0.08, 0.94, "A little left"), (0.17, 0.96, "About a scoop left"), (0.38, 0.93, "A lot left")]):
        img, share = render(aim, SEED + 100 + i, gain=gain)
        name = f"return-{i + 1}.jpg"
        img.save(OUT / name, quality=88)
        manifest["tests"].append({"file": name, "label": label, "true_grams": grams_for(share) if aim else 0, "rendered_share": round(share, 4)})
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=1), encoding="utf-8")
    print("wrote", len(list(OUT.glob("*.jpg"))), "images to", OUT)


if __name__ == "__main__":
    main()
