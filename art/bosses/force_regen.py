#!/usr/bin/env python3
"""Force-regenerate the public/assets/bosses folder with the new cartoon-style
images, mapping raw descriptive names to short canonical names."""
from pathlib import Path
import os

RAW = Path(r"C:\kaifa\game-google-clean\art\bosses\raw")
OUT = Path(r"C:\kaifa\game-google-clean\public\assets\bosses")

# Hard-delete everything in OUT
removed = 0
for f in OUT.iterdir():
    if f.is_file():
        f.unlink()
        removed += 1
print(f"Hard-removed {removed} existing files in public/assets/bosses.")

# Mapping from raw stem -> public filename
def map_name(stem: str) -> str | None:
    if stem.endswith("_test") or stem.endswith("_test2"):
        return None
    # Patterns we want:
    #   campaign_10_nian           -> campaign_10
    #   campaign_1_guardian        -> campaign_1
    #   campaign_7_variant_b_laser -> campaign_7_variant_b
    #   campaign_10_variant_b_xxx  -> campaign_10_xxx
    parts = stem.split("_")
    if parts[0] != "campaign":
        return None
    campaign_n = parts[0] + "_" + parts[1]
    rest = parts[2:]
    if not rest:
        return campaign_n + ".png"
    if rest[0] == "variant" and len(rest) >= 2 and rest[1] == "b":
        return f"{campaign_n}_variant_b.png"
    if rest[0] == "variant" and rest[1] == "b":
        # already handled above
        pass
    # else: campaign_N_<something> -> campaign_N_<something>
    return f"{campaign_n}_{'_'.join(rest)}.png"

from PIL import Image, ImageFilter

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

print(f"\nFinal count: {count_ok} ok, {count_skip} skipped")
print("Final files:")
for f in sorted(OUT.iterdir()):
    print(' ', f.name)
