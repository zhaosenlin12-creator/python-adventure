from __future__ import annotations

import json
import subprocess
from collections import deque
from io import BytesIO
from pathlib import Path
from typing import Dict, Iterable, List, Sequence, TypedDict

import requests
from PIL import Image, ImageFilter


REPO_ROOT = Path(__file__).resolve().parent.parent
PARENT_REPO_ROOT = REPO_ROOT.parent
OUTPUT_ROOT = REPO_ROOT / "public" / "assets" / "pets" / "camp-remaster"
SNAPSHOT_GIT_PATH = "camp-pk-system/server/classPetCatalogSnapshot.json"

CANVAS_SIZE = 512
TARGET_FILL = 0.78
GROUND_MARGIN = 34
REQUEST_TIMEOUT = 45
DEFAULT_STAGE_PICK = (1, 3, 5, 7, 9)


class SnapshotPet(TypedDict, total=False):
    assetKey: str
    evolutionStages: List[str]


class PetSourceConfig(TypedDict):
    asset_key: str
    stage_pick: Sequence[int]


PET_SOURCES: Dict[str, PetSourceConfig] = {
    "british-shorthair": {"asset_key": "yingduan", "stage_pick": DEFAULT_STAGE_PICK},
    "lop-rabbit": {"asset_key": "chuietu", "stage_pick": DEFAULT_STAGE_PICK},
    "shiba-inu": {"asset_key": "caiquan", "stage_pick": DEFAULT_STAGE_PICK},
    "golden-cat": {"asset_key": "glodcat", "stage_pick": DEFAULT_STAGE_PICK},
    "border-collie": {"asset_key": "bianmu", "stage_pick": DEFAULT_STAGE_PICK},
    "snow-leopard": {"asset_key": "xuebao", "stage_pick": DEFAULT_STAGE_PICK},
    "blazing-dragon": {"asset_key": "huolong", "stage_pick": DEFAULT_STAGE_PICK},
    "yinglong": {"asset_key": "yinglong", "stage_pick": DEFAULT_STAGE_PICK},
    "baize": {"asset_key": "baize", "stage_pick": DEFAULT_STAGE_PICK},
    "silver-lynx": {"asset_key": "yincsu", "stage_pick": DEFAULT_STAGE_PICK},
    "forest-maine": {"asset_key": "midaishu", "stage_pick": DEFAULT_STAGE_PICK},
    "coffee-shadow": {"asset_key": "coffeecat", "stage_pick": DEFAULT_STAGE_PICK},
    "husky-rider": {"asset_key": "hashiqi", "stage_pick": DEFAULT_STAGE_PICK},
    "pom-angel": {"asset_key": "bomei", "stage_pick": DEFAULT_STAGE_PICK},
    "mini-civet": {"asset_key": "miniciw", "stage_pick": DEFAULT_STAGE_PICK},
    "dutch-whisker": {"asset_key": "helanzhu", "stage_pick": DEFAULT_STAGE_PICK},
    "neon-hound": {"asset_key": "keji", "stage_pick": DEFAULT_STAGE_PICK},
    "qiongqi-howl": {"asset_key": "qiongqi", "stage_pick": DEFAULT_STAGE_PICK},
    "taowu-flare": {"asset_key": "taowu", "stage_pick": DEFAULT_STAGE_PICK},
    "golden-roc": {"asset_key": "jinpeng", "stage_pick": DEFAULT_STAGE_PICK},
}


def clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(upper, value))


def compute_luminance(rgb: tuple[int, int, int]) -> float:
    r, g, b = rgb
    return (0.2126 * r) + (0.7152 * g) + (0.0722 * b)


def compute_chroma(rgb: tuple[int, int, int]) -> int:
    return max(rgb) - min(rgb)


def is_background_pixel(rgb: tuple[int, int, int]) -> bool:
    luminance = compute_luminance(rgb)
    chroma = compute_chroma(rgb)
    min_channel = min(rgb)
    r, g, b = rgb

    return (
        (luminance >= 240 and chroma <= 34)
        or (min_channel >= 226 and chroma <= 62)
        or (r >= 232 and g >= 222 and b >= 196 and chroma <= 86)
    )


def load_snapshot_catalog() -> Dict[str, SnapshotPet]:
    raw = subprocess.check_output(
        ["git", "-C", str(PARENT_REPO_ROOT), "show", f"HEAD:{SNAPSHOT_GIT_PATH}"],
        text=True,
        encoding="utf-8",
    )
    data = json.loads(raw)
    return {
        item["assetKey"]: item
        for item in data
        if isinstance(item, dict) and item.get("assetKey") and item.get("evolutionStages")
    }


def select_stage_chain(stages: Sequence[str], stage_pick: Sequence[int]) -> List[str]:
    if not stages:
        return []

    picked: List[str] = []
    max_index = len(stages) - 1
    for stage_index in stage_pick:
        safe_index = int(clamp(stage_index, 0, max_index))
        picked.append(stages[safe_index])
    return picked


def iter_outputs(snapshot_catalog: Dict[str, SnapshotPet]) -> Iterable[tuple[str, int, str]]:
    for slug, config in PET_SOURCES.items():
        snapshot_entry = snapshot_catalog.get(config["asset_key"])
        if not snapshot_entry:
            raise RuntimeError(f"Missing snapshot entry for asset key: {config['asset_key']}")

        stage_chain = select_stage_chain(snapshot_entry.get("evolutionStages", []), config["stage_pick"])
        if len(stage_chain) != 5:
            raise RuntimeError(f"Expected 5 stages for {slug}, got {len(stage_chain)}")

        for stage_number, url in enumerate(stage_chain, start=1):
            yield slug, stage_number, url


def download_image(url: str) -> Image.Image:
    response = requests.get(url, timeout=REQUEST_TIMEOUT)
    response.raise_for_status()
    return Image.open(BytesIO(response.content)).convert("RGB")


def flood_fill_background(image: Image.Image) -> List[List[bool]]:
    width, height = image.size
    visited = [[False] * width for _ in range(height)]
    queue: deque[tuple[int, int]] = deque()

    def maybe_enqueue(x: int, y: int) -> None:
        if visited[y][x]:
            return
        if is_background_pixel(image.getpixel((x, y))):
            visited[y][x] = True
            queue.append((x, y))

    for x in range(width):
        maybe_enqueue(x, 0)
        maybe_enqueue(x, height - 1)
    for y in range(height):
        maybe_enqueue(0, y)
        maybe_enqueue(width - 1, y)

    while queue:
        x, y = queue.popleft()
        for nx, ny in (
            (x - 1, y),
            (x + 1, y),
            (x, y - 1),
            (x, y + 1),
            (x - 1, y - 1),
            (x + 1, y - 1),
            (x - 1, y + 1),
            (x + 1, y + 1),
        ):
            if 0 <= nx < width and 0 <= ny < height and not visited[ny][nx]:
                if is_background_pixel(image.getpixel((nx, ny))):
                    visited[ny][nx] = True
                    queue.append((nx, ny))

    return visited


def build_alpha_mask(image: Image.Image, background_mask: List[List[bool]]) -> Image.Image:
    width, height = image.size
    alpha = Image.new("L", (width, height), 255)
    pixels = alpha.load()

    for y, row in enumerate(background_mask):
        for x, is_background in enumerate(row):
            if is_background:
                pixels[x, y] = 0

    rgb = image.load()
    for y in range(height):
        for x in range(width):
            if pixels[x, y] == 0:
                continue

            has_background_neighbor = False
            for nx, ny in (
                (x - 1, y),
                (x + 1, y),
                (x, y - 1),
                (x, y + 1),
                (x - 1, y - 1),
                (x + 1, y - 1),
                (x - 1, y + 1),
                (x + 1, y + 1),
            ):
                if 0 <= nx < width and 0 <= ny < height and background_mask[ny][nx]:
                    has_background_neighbor = True
                    break

            if not has_background_neighbor:
                continue

            current_rgb = rgb[x, y]
            luminance = compute_luminance(current_rgb)
            chroma = compute_chroma(current_rgb)
            if luminance >= 242 and chroma <= 28:
                pixels[x, y] = 0
            elif luminance >= 230 and chroma <= 42:
                pixels[x, y] = min(pixels[x, y], 168)

    softened = alpha.filter(ImageFilter.GaussianBlur(radius=0.85))
    return softened.point(lambda value: 0 if value < 22 else min(255, int(value * 1.12)))


def apply_alpha_mask(image: Image.Image, alpha_mask: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    rgba.putalpha(alpha_mask)
    return rgba


def normalize_canvas(image: Image.Image) -> Image.Image:
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    if not bbox:
        return Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))

    cropped = image.crop(bbox)
    max_side = max(cropped.size)
    margin = max(12, round(max_side * 0.04))
    padded = Image.new(
        "RGBA",
        (cropped.width + margin * 2, cropped.height + margin * 2),
        (0, 0, 0, 0),
    )
    padded.paste(cropped, (margin, margin), cropped)

    fit_limit = int(CANVAS_SIZE * TARGET_FILL)
    scale = min(fit_limit / padded.width, fit_limit / padded.height)
    resized = padded.resize(
        (max(1, round(padded.width * scale)), max(1, round(padded.height * scale))),
        Image.Resampling.LANCZOS,
    )

    canvas = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
    offset_x = (CANVAS_SIZE - resized.width) // 2
    offset_y = CANVAS_SIZE - resized.height - GROUND_MARGIN
    if offset_y < 0:
        offset_y = (CANVAS_SIZE - resized.height) // 2
    canvas.paste(resized, (offset_x, offset_y), resized)
    return canvas


def build_assets() -> None:
    snapshot_catalog = load_snapshot_catalog()
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)

    all_outputs = list(iter_outputs(snapshot_catalog))
    total = len(all_outputs)
    for current, (slug, stage_index, url) in enumerate(all_outputs, start=1):
        print(f"[{current:02d}/{total:02d}] {slug} stage-{stage_index}: downloading")
        source = download_image(url)
        background_mask = flood_fill_background(source)
        alpha_mask = build_alpha_mask(source, background_mask)
        transparent = apply_alpha_mask(source, alpha_mask)
        normalized = normalize_canvas(transparent)

        pet_output_dir = OUTPUT_ROOT / slug
        pet_output_dir.mkdir(parents=True, exist_ok=True)
        output_path = pet_output_dir / f"stage-{stage_index}.png"
        normalized.save(output_path, optimize=True)
        print(f"  saved -> {output_path}")


if __name__ == "__main__":
    build_assets()
