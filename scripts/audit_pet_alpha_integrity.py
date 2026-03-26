from __future__ import annotations

from collections import deque
from pathlib import Path
from typing import Dict

from PIL import Image


ROOT = Path(__file__).resolve().parent.parent
PET_ROOT = ROOT / "public" / "assets" / "pets" / "camp-remaster"
ALPHA_SOLID_THRESHOLD = 32
MIN_HOLE_AREA = 20
MAX_ALLOWED_RATIO = 0.0015

MAPPED_SLUGS: Dict[str, str] = {
    "code_kitty": "british-shorthair",
    "algo_bunny": "lop-rabbit",
    "shiba_debugger": "shiba-inu",
    "bit_bot": "golden-cat",
    "data_sprite": "border-collie",
    "ava_ai": "snow-leopard",
    "code_dragon": "blazing-dragon",
    "giraffe_oracle": "yinglong",
    "snow_cat": "baize",
    "silver_lynx": "silver-lynx",
    "forest_maine": "tabby-coil",
    "coffee_shadow": "coffee-shadow",
    "husky_rider": "husky-rider",
    "pom_angel": "pom-angel",
    "mini_civet": "mini-civet",
    "dutch_whisker": "dutch-whisker",
    "neon_hound": "neon-hound",
    "qiongqi_howl": "qiongqi-howl",
    "taowu_flare": "taowu-flare",
    "golden_roc": "golden-roc",
}


def audit_image(path: Path) -> tuple[float, int, int, int]:
    image = Image.open(path).convert("RGBA")
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    if not bbox:
        return 0.0, 0, 0, 0

    cropped = alpha.crop(bbox)
    width, height = cropped.size
    pixels = cropped.load()
    solid = [[pixels[x, y] >= ALPHA_SOLID_THRESHOLD for x in range(width)] for y in range(height)]
    visited = [[False] * width for _ in range(height)]
    queue: deque[tuple[int, int]] = deque()

    def enqueue_if_outer_transparent(x: int, y: int) -> None:
        if visited[y][x] or solid[y][x]:
            return
        visited[y][x] = True
        queue.append((x, y))

    for x in range(width):
        enqueue_if_outer_transparent(x, 0)
        enqueue_if_outer_transparent(x, height - 1)
    for y in range(height):
        enqueue_if_outer_transparent(0, y)
        enqueue_if_outer_transparent(width - 1, y)

    while queue:
        x, y = queue.popleft()
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < width and 0 <= ny < height:
                enqueue_if_outer_transparent(nx, ny)

    hole_area = 0
    hole_count = 0
    largest_hole = 0
    solid_area = sum(sum(1 for cell in row if cell) for row in solid)

    for y in range(height):
        for x in range(width):
            if solid[y][x] or visited[y][x]:
                continue

            area = 0
            queue = deque([(x, y)])
            visited[y][x] = True
            while queue:
                cx, cy = queue.popleft()
                area += 1
                for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
                    if 0 <= nx < width and 0 <= ny < height and not solid[ny][nx] and not visited[ny][nx]:
                        visited[ny][nx] = True
                        queue.append((nx, ny))

            if area >= MIN_HOLE_AREA:
                hole_area += area
                hole_count += 1
                largest_hole = max(largest_hole, area)

    ratio = hole_area / solid_area if solid_area else 0.0
    return ratio, hole_count, largest_hole, solid_area


def main() -> int:
    failed = False
    for pet_type, slug in MAPPED_SLUGS.items():
        stage_paths = sorted((PET_ROOT / slug).glob("stage-*.png"))
        worst: tuple[float, int, int, str, int] | None = None
        for stage_path in stage_paths:
            ratio, hole_count, largest_hole, solid_area = audit_image(stage_path)
            candidate = (ratio, hole_count, largest_hole, stage_path.name, solid_area)
            if worst is None or candidate > worst:
                worst = candidate

        if worst is None:
            print(f"[FAIL] {pet_type:<16} missing generated assets for slug={slug}")
            failed = True
            continue

        ratio, hole_count, largest_hole, stage_name, solid_area = worst
        status = "OK"
        if ratio > MAX_ALLOWED_RATIO:
            status = "FAIL"
            failed = True
        print(
            f"[{status}] {pet_type:<16} slug={slug:<18} ratio={ratio:.4f} "
            f"holes={hole_count:<2} largest={largest_hole:<5} stage={stage_name:<10} solid={solid_area}"
        )

    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
