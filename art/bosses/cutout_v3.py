#!/usr/bin/env python3
"""Final cutout: hard-delete target, then cutout all raw files with simple mapping."""
from pathlib import Path
import os
from PIL import Image, ImageFilter

RAW = Path(r"C:\kaifa\game-google-clean\art\bosses\raw")
OUT = Path(r"C:\kaifa\game-google-clean\public\assets\bosses")

# Hard-delete target
for f in OUT.iterdir():
    if f.is_file():
        f.unlink()
print("Cleared public/assets/bosses.")

def map_name(stem: str) -> str | None:
    if stem.endswith("_test") or stem.endswith("_test2"):
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
                mn = min(r, g, b)
                if mn >= 240:
                    px[x, y] = (255, 255, 255, 0)
                elif mn >= 220:
                    alpha = int((255 - mn) / (255 - 220) * 255)
                    px[x, y] = (r, g, b, alpha)
                elif mn >= 200:
                    alpha = int((mn - 200) / 20 * 255)
                    px[x, y] = (r, g, b, max(0, min(255, alpha)))
                else:
                    px[x, y] = (r, g, b, 255)
        r, g, b, a = im.split()
        a = a.filter(ImageFilter.GaussianBlur(radius=0.6))
        im = Image.merge("RGBA", (r, g, b, a))
        im.save(dst, "PNG", optimize=True)
        return True
    except Exception as e:
        print(f"[ERR] {src.name}: {e}")
        return False

count_ok = 0
count_skip = 0
for src in sorted(RAW.glob("*.png")):
    name = map_name(src.stem)
    if not name:
        count_skip += 1
        continue
    dst = OUT / name
    if cutout(src, dst):
        print(f"[OK] {name}: {dst.stat().st_size} bytes")
        count_ok += 1

print(f"\nDone. ok={count_ok}, skipped_test={count_skip}")
print("Final files:")
for f in sorted(OUT.iterdir()):
    print(' ', f.name)
