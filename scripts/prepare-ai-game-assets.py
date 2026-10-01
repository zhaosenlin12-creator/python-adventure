from __future__ import annotations

import json
from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
ARENA_RAW = ROOT / "art" / "arena" / "raw"
FOOD_RAW = ROOT / "art" / "pet-home" / "raw"
ARENA_OUT = ROOT / "public" / "assets" / "arena"
FOOD_OUT = ROOT / "public" / "assets" / "pet-home" / "food"


def remove_connected_background(image: Image.Image, threshold: int) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size
    background = pixels[0, 0][:3]
    mask = Image.new("L", (width, height), 0)
    mask_pixels = mask.load()
    queue: deque[tuple[int, int]] = deque()
    visited: set[tuple[int, int]] = set()

    for x in range(width):
        queue.append((x, 0))
        queue.append((x, height - 1))
    for y in range(height):
        queue.append((0, y))
        queue.append((width - 1, y))

    def is_background(x: int, y: int) -> bool:
        red, green, blue, _ = pixels[x, y]
        return (
            abs(red - background[0])
            + abs(green - background[1])
            + abs(blue - background[2])
            <= threshold
        )

    while queue:
        x, y = queue.popleft()
        if (x, y) in visited or not (0 <= x < width and 0 <= y < height):
            continue
        visited.add((x, y))
        if not is_background(x, y):
            continue
        mask_pixels[x, y] = 255
        queue.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))

    alpha = Image.eval(mask, lambda value: 0 if value else 255)
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.8))
    rgba.putalpha(alpha)
    return rgba


def normalize(image: Image.Image, size: int = 256, margin: int = 18) -> Image.Image:
    alpha = image.getchannel("A")
    bbox = alpha.point(lambda value: 255 if value > 10 else 0).getbbox()
    if bbox:
        image = image.crop(bbox)
    scale = min((size - margin * 2) / max(1, image.width), (size - margin * 2) / max(1, image.height))
    image = image.resize(
        (max(1, round(image.width * scale)), max(1, round(image.height * scale))),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.alpha_composite(image, ((size - image.width) // 2, (size - image.height) // 2))
    return canvas


def prepare_characters() -> list[dict[str, str]]:
    ARENA_OUT.mkdir(parents=True, exist_ok=True)
    manifest = []
    for source_name, output_name, threshold in (
        ("duel-blue.png", "duel-blue.png", 54),
        ("duel-coral.png", "duel-coral.png", 54),
    ):
        source = ARENA_RAW / source_name
        output = ARENA_OUT / output_name
        image = normalize(remove_connected_background(Image.open(source), threshold), 512, 24)
        image.save(output, optimize=True)
        manifest.append({"source": str(source.relative_to(ROOT)), "output": str(output.relative_to(ROOT)), "size": list(image.size)})
    return manifest


def prepare_food_atlas() -> list[dict[str, str]]:
    FOOD_OUT.mkdir(parents=True, exist_ok=True)
    source = Image.open(FOOD_RAW / "food-atlas-v1.png").convert("RGBA")
    cell_width = source.width // 4
    cell_height = source.height // 3
    item_cells = {
        "apple": (0, 0),
        "bread": (1, 0),
        "milk": (2, 0),
        "meat": (3, 0),
        "cake": (1, 1),
        "star_cookie": (2, 1),
        "rainbow_candy": (3, 1),
        "bone": (0, 2),
        "fish": (1, 2),
        "energy_drink": (2, 2),
        "mystery_box": (3, 2),
    }
    manifest = []
    for food_id, (column, row) in item_cells.items():
        cell = source.crop(
            (
                column * cell_width,
                row * cell_height,
                (column + 1) * cell_width,
                (row + 1) * cell_height,
            )
        )
        image = normalize(remove_connected_background(cell, 70), 256, 30)
        output = FOOD_OUT / f"{food_id}.png"
        image.save(output, optimize=True)
        manifest.append({"id": food_id, "output": str(output.relative_to(ROOT)), "size": list(image.size)})
    return manifest


def main() -> None:
    manifest = {"characters": prepare_characters(), "food": prepare_food_atlas()}
    manifest_path = ROOT / "art" / "arena" / "ai-asset-manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"characters": len(manifest["characters"]), "food": len(manifest["food"])}, ensure_ascii=False))


if __name__ == "__main__":
    main()
