from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSET_GROUPS = [
    (ROOT / "public/assets/bosses", (256, 256)),
    (ROOT / "public/assets/player", (256, 384)),
]


def optimize(path: Path, maximum: tuple[int, int]) -> None:
    with Image.open(path) as image:
        image = image.convert("RGBA")
        image.thumbnail(maximum, Image.Resampling.LANCZOS)
        size = image.size
        image.save(path, format="PNG", optimize=True, compress_level=9)
    print(f"{path.relative_to(ROOT)} {size} {path.stat().st_size} bytes")


for folder, maximum in ASSET_GROUPS:
    for path in sorted(folder.glob("*.png")):
        optimize(path, maximum)
