from __future__ import annotations

from collections import deque
from io import BytesIO
from pathlib import Path
from typing import Dict, Iterable, List

import requests
from PIL import Image


REPO_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_ROOT = REPO_ROOT / "public" / "assets" / "pets" / "camp-remaster"
CANVAS_SIZE = 512
TARGET_FILL = 0.72
REQUEST_TIMEOUT = 45

PET_STAGE_CHAINS: Dict[str, List[str]] = {
    "british-shorthair": [
        "https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/yingduan/1200000151.jpg",
        "https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/yingduan/12000001959.jpg",
        "https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/yingduan/12000001975.jpg",
        "https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/yingduan/12000001999.jpg",
        "https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/yingduan/12000002015.jpg",
    ],
    "lop-rabbit": [
        "https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/chuietu/12000000255.jpg",
        "https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/chuietu/12000000264.jpg",
        "https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/chuietu/12000000280.jpg",
        "https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/chuietu/12000000304.jpg",
        "https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/chuietu/12000000320.jpg",
    ],
    "shiba-inu": [
        "https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/caiquan/12000000030.jpg",
        "https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/caiquan/12000000046.jpg",
        "https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/caiquan/12000000062.jpg",
        "https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/caiquan/12000000086.jpg",
        "https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/caiquan/CQ.jpg",
    ],
    "golden-cat": [
        "https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/glodcat/100000231.jpg",
        "https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/glodcat/10500000038.jpg",
        "https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/glodcat/10500000054.jpg",
        "https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/glodcat/10500000078.jpg",
        "https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/glodcat/10500000094.jpg",
    ],
    "border-collie": [
        "https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/bianmu/100000396.jpg",
        "https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/bianmu/10500000829.jpg",
        "https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/bianmu/10500000845.jpg",
        "https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/bianmu/10500000869.jpg",
        "https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/bianmu/10500000885.jpg",
    ],
    "snow-leopard": [
        "https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/xuebao/01.jpg",
        "https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/xuebao/03.jpg",
        "https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/xuebao/05.jpg",
        "https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/xuebao/8.2.jpg",
        "https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/xuebao/x.jpg",
    ],
    "blazing-dragon": [
        "https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/huolong/01.jpg",
        "https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/huolong/03.1.jpg",
        "https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/huolong/04.jpg",
        "https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/huolong/08.jpg",
        "https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/huolong/10.jpg",
    ],
    "yinglong": [
        "https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/yinglong/01.jpg",
        "https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/yinglong/03.jpg",
        "https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/yinglong/05.jpg",
        "https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/yinglong/08.jpg",
        "https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/yinglong/10.jpg",
    ],
    "baize": [
        "https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/baize/01.jpg",
        "https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/baize/03.jpg",
        "https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/baize/05.jpg",
        "https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/baize/09.jpg",
        "https://brvjqiusgeqeyfadfwga.supabase.co/storage/v1/object/public/cwk/baize/11.jpg",
    ],
}


def is_background_pixel(rgb: tuple[int, int, int]) -> bool:
    r, g, b = rgb
    luminance = (0.2126 * r) + (0.7152 * g) + (0.0722 * b)
    chroma = max(rgb) - min(rgb)
    return luminance >= 238 and chroma <= 28


def flood_fill_background(image: Image.Image) -> List[List[bool]]:
    width, height = image.size
    rgb = image.convert("RGB")
    visited = [[False] * width for _ in range(height)]
    queue: deque[tuple[int, int]] = deque()

    def maybe_enqueue(x: int, y: int) -> None:
        if visited[y][x]:
            return
        if is_background_pixel(rgb.getpixel((x, y))):
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
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < width and 0 <= ny < height and not visited[ny][nx]:
                if is_background_pixel(rgb.getpixel((nx, ny))):
                    visited[ny][nx] = True
                    queue.append((nx, ny))

    return visited


def apply_background_mask(image: Image.Image, background_mask: List[List[bool]]) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    for y, row in enumerate(background_mask):
        for x, is_background in enumerate(row):
            if is_background:
                pixels[x, y] = (255, 255, 255, 0)

    return rgba


def normalize_canvas(image: Image.Image) -> Image.Image:
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    if not bbox:
        return Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))

    cropped = image.crop(bbox)
    max_side = max(cropped.size)
    margin = max(12, round(max_side * 0.04))
    padded = Image.new("RGBA", (cropped.width + margin * 2, cropped.height + margin * 2), (0, 0, 0, 0))
    padded.paste(cropped, (margin, margin), cropped)

    fit_limit = int(CANVAS_SIZE * TARGET_FILL)
    scale = min(fit_limit / padded.width, fit_limit / padded.height)
    resized = padded.resize(
        (max(1, round(padded.width * scale)), max(1, round(padded.height * scale))),
        Image.Resampling.LANCZOS,
    )

    canvas = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
    offset_x = (CANVAS_SIZE - resized.width) // 2
    offset_y = (CANVAS_SIZE - resized.height) // 2
    canvas.paste(resized, (offset_x, offset_y), resized)
    return canvas


def download_image(url: str) -> Image.Image:
    response = requests.get(url, timeout=REQUEST_TIMEOUT)
    response.raise_for_status()
    return Image.open(BytesIO(response.content)).convert("RGB")


def iter_outputs() -> Iterable[tuple[str, int, str]]:
    for pet_key, stages in PET_STAGE_CHAINS.items():
        for index, url in enumerate(stages, start=1):
            yield pet_key, index, url


def build_assets() -> None:
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)

    total = sum(len(stages) for stages in PET_STAGE_CHAINS.values())
    current = 0
    for pet_key, stage_index, url in iter_outputs():
        current += 1
        print(f"[{current:02d}/{total:02d}] {pet_key} stage-{stage_index}: downloading")
        source = download_image(url)
        background_mask = flood_fill_background(source)
        transparent = apply_background_mask(source, background_mask)
        normalized = normalize_canvas(transparent)

        pet_output_dir = OUTPUT_ROOT / pet_key
        pet_output_dir.mkdir(parents=True, exist_ok=True)
        output_path = pet_output_dir / f"stage-{stage_index}.png"
        normalized.save(output_path, optimize=True)
        print(f"  saved -> {output_path}")


if __name__ == "__main__":
    build_assets()
