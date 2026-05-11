from __future__ import annotations

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "kenney_pico-8-city"
SAMPLE_PATH = SOURCE_DIR / "Sample.png"
TILES_DIR = SOURCE_DIR / "Tiles"
OUTPUT_DIR = ROOT / "public" / "code-research" / "pico-city"


SCENE_CROPS = {
    "scene-training-street.png": (0, 118, 320, 338),
    "scene-patrol-street.png": (220, 118, 540, 338),
    "scene-loop-quay.png": (500, 118, 820, 338),
}

SPRITES = {
    "hero-cadet-blue.png": "tile_0356.png",
    "guard-cadet-red.png": "tile_0332.png",
    "exit-flag.png": "tile_0239.png",
    "street-fence.png": "tile_0238.png",
    "street-tree.png": "tile_0358.png",
}


def export_scene_assets() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    sample = Image.open(SAMPLE_PATH).convert("RGBA")

    for filename, crop_box in SCENE_CROPS.items():
        crop = sample.crop(crop_box)
        crop = crop.resize((crop.width * 3, crop.height * 3), Image.Resampling.NEAREST)
        crop.save(OUTPUT_DIR / filename)

    for filename, tile_name in SPRITES.items():
        sprite = Image.open(TILES_DIR / tile_name).convert("RGBA")
        sprite = sprite.resize((64, 64), Image.Resampling.NEAREST)
        sprite.save(OUTPUT_DIR / filename)


if __name__ == "__main__":
    export_scene_assets()
