#!/usr/bin/env python3
"""Cut out the white background from boss images and save as transparent PNG.

Naming convention:
- ``campaign_<N>_<extra>`` maps directly to ``campaign_<N>_<extra>.png``.
- ``campaign_<N>`` keeps the bare stem.
- Files ending in ``_test`` are skipped.
"""
from __future__ import annotations
from pathlib import Path
from PIL import Image, ImageFilter

RAW = Path(r"C:\kaifa\game-google-clean\art\bosses\raw")
OUT = Path(r"C:\kaifa\game-google-clean\public\assets\bosses")
OUT.mkdir(parents=True, exist_ok=True)


def map_name(p: Path) -> str | None:
    stem = p.stem
    if stem.endswith("_test"):
        return None
    return f"{stem}.png"


def cutout(src: Path, dst: Path) -> bool:
    try:
        im = Image.open(src).convert("RGBA")
        w, h = im.size
        px = im.load()
        for y in range(h):
            for x in range(w):
                r, g, b, a = px[x, y]
                min_chan = min(r, g, b)
                if min_chan >= 240:
                    px[x, y] = (255, 255, 255, 0)
                elif min_chan >= 220:
                    alpha = int((255 - min_chan) / (255 - 220) * 255)
                    px[x, y] = (r, g, b, alpha)
                elif min_chan >= 200:
                    alpha = int((min_chan - 200) / 20 * 255)
                    px[x, y] = (r, g, b, max(0, min(255, alpha)))
                else:
                    px[x, y] = (r, g, b, 255)
        r, g, b, a = im.split()
        a = a.filter(ImageFilter.GaussianBlur(radius=0.6))
        im = Image.merge("RGBA", (r, g, b, a))
        im.save(dst, "PNG", optimize=True)
        return True
    except Exception as e:
        print(f"[ERR] {src}: {e}")
        return False


count_ok = 0
count_skip = 0
for src in sorted(RAW.glob("*.png")):
    name = map_name(src)
    if not name:
        count_skip += 1
        continue
    dst = OUT / name
    if dst.exists() and dst.stat().st_size > 5000:
        print(f"[SKIP] {dst.name}")
        count_ok += 1
        continue
    if cutout(src, dst):
        print(f"[OK] {dst.name}: {dst.stat().st_size} bytes")
        count_ok += 1

print(f"\nDone. ok={count_ok}, skipped_test={count_skip}")
