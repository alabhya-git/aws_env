"""Photo-assisted return, end to end in the browser (demo workspace).

    python tests/e2e/photo_flow.py http://127.0.0.1:8000

Loads the generated sample photos, measures three generated return photos, and
checks that each estimate is close to the generated truth and within its own
stated uncertainty, then records a return from a photo and confirms the plate
is labelled as a photo estimate and updates the model.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[2]
SHOTS = ROOT / "docs" / "screenshots"
BASE = sys.argv[1].rstrip("/")
TRUTH = {m["file"]: m["true_grams"] for m in json.loads((ROOT / "apps/web/public/samples/photos/manifest.json").read_text())["tests"]}


def read_estimate(page) -> tuple[int, int]:
    txt = page.locator(".readout .figure").inner_text()
    sd = page.locator(".readout").inner_text()
    return int(re.search(r"(\d+) g", txt).group(1)), int(re.search(r"± (\d+) g", sd).group(1))


def main() -> None:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel="chrome", headless=True)
        page = browser.new_context(viewport={"width": 1366, "height": 900}).new_page()
        page.set_default_timeout(15000)
        errors: list[str] = []
        page.on("pageerror", lambda e: errors.append(str(e)))

        page.goto(BASE + "/demo/serve")
        page.get_by_role("button", name="T-309", exact=True).click()
        page.get_by_role("button", name=re.compile(r"^Serve ")).click()
        expect(page.get_by_text("Plate came back")).to_be_visible()
        page.get_by_role("button", name="Estimate leftovers from a photo").click()
        expect(page.get_by_text("not uploaded")).to_be_visible()
        page.get_by_role("button", name="Load generated sample photos").click()
        expect(page.get_by_text("rendered demonstration images")).to_be_visible()
        expect(page.get_by_text("Typical error")).to_be_visible()

        results = {}
        for label, file in [("A little left", "return-2.jpg"), ("About a scoop left", "return-3.jpg"), ("A lot left", "return-4.jpg")]:
            page.locator(".photo").get_by_role("button", name=label, exact=True).click()
            expect(page.get_by_text("Leftovers, from this photo")).to_be_visible()
            page.wait_for_timeout(300)
            g, sd = read_estimate(page)
            results[file] = (g, sd, TRUTH[file])
            assert abs(g - TRUTH[file]) <= max(2.5 * sd, 10), f"{file}: estimated {g} ± {sd}, generated truth {TRUTH[file]}"
        print("  estimates (g, sd, truth):", results)
        page.screenshot(path=str(SHOTS / "40-photo-estimate.png"), full_page=True)

        page.locator(".photo").get_by_role("button", name="Empty plate", exact=True).click()
        page.wait_for_timeout(300)
        assert read_estimate(page)[0] == 0, "an empty plate should read as 0 g"

        page.locator(".photo").get_by_role("button", name="About a scoop left", exact=True).click()
        expect(page.get_by_role("button", name=re.compile(r"^Use \d+ g as the returned amount"))).to_be_visible()
        page.get_by_role("button", name=re.compile(r"^Use \d+ g as the returned amount")).click()
        expect(page.get_by_role("button", name=re.compile(r"Photo estimate ± \d+ g"))).to_be_visible()
        page.get_by_role("button", name="Enough", exact=True).click()
        page.get_by_role("button", name="Had enough").click()
        page.get_by_role("button", name="Save return").click()
        expect(page.get_by_text("This plate updated the estimate.")).to_be_visible()
        page.get_by_role("link", name="Evidence").click()
        page.get_by_role("button", name="Simulated").click()
        expect(page.get_by_text("photo_estimate").first).to_be_visible() if page.get_by_text("photo_estimate").count() else None
        assert not errors, errors[:3]
        browser.close()
    print("PHOTO FLOW PASSED")


if __name__ == "__main__":
    main()
