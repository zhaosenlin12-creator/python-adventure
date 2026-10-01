from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "art" / "pet-home" / "decorations"
OUT = ROOT / "public" / "assets" / "pet-home" / "decorations"
ASSET_IDS = (
    "table_wood",
    "bookshelf",
    "plant_small",
    "toy_ball",
    "toy_robot",
    "cactus",
    "flower_vase",
    "music_box",
    "tv_retro",
    "picture_frame",
    "clock_wall",
)


def build_mask(image: np.ndarray) -> np.ndarray:
    height, width = image.shape[:2]
    margin = max(24, int(min(width, height) * 0.11))
    mask = np.full((height, width), cv2.GC_PR_BGD, dtype=np.uint8)
    mask[:margin, :] = cv2.GC_BGD
    mask[-margin:, :] = cv2.GC_BGD
    mask[:, :margin] = cv2.GC_BGD
    mask[:, -margin:] = cv2.GC_BGD
    background_model = np.zeros((1, 65), np.float64)
    foreground_model = np.zeros((1, 65), np.float64)
    cv2.grabCut(
        image,
        mask,
        (margin, margin, width - margin * 2, height - margin * 2),
        background_model,
        foreground_model,
        7,
        cv2.GC_INIT_WITH_RECT,
    )
    foreground = np.where(
        (mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD),
        255,
        0,
    ).astype(np.uint8)
    kernel = np.ones((5, 5), np.uint8)
    foreground = cv2.morphologyEx(foreground, cv2.MORPH_CLOSE, kernel, iterations=2)
    foreground = cv2.morphologyEx(foreground, cv2.MORPH_OPEN, kernel, iterations=1)
    components, labels, stats, _ = cv2.connectedComponentsWithStats(foreground, 8)
    if components > 1:
        areas = stats[1:, cv2.CC_STAT_AREA]
        largest = int(np.argmax(areas)) + 1
        keep = np.where(labels == largest, 255, 0).astype(np.uint8)
        if int(keep.sum()) > int(foreground.sum() * 0.62):
            foreground = keep
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    hue, saturation, value = cv2.split(hsv)
    background_like = (
        (hue >= 70)
        & (hue <= 110)
        & (saturation <= 150)
        & (value >= 140)
        & (foreground > 0)
    ).astype(np.uint8) * 255
    components, labels, stats, _ = cv2.connectedComponentsWithStats(background_like, 8)
    for component in range(1, components):
        x, y, component_width, component_height, area = stats[component]
        is_wide_shadow = (
            area > 1000
            and component_width >= component_height * 1.35
            and component_height <= height * 0.28
        )
        is_bottom_shadow = (
            area > 1000
            and y + component_height >= height * 0.68
            and component_width >= width * 0.3
            and component_height <= height * 0.3
        )
        if is_wide_shadow or is_bottom_shadow:
            foreground[labels == component] = 0
    return foreground


def save_cutout(source: Path, destination: Path) -> None:
    bgr = cv2.imread(str(source), cv2.IMREAD_COLOR)
    if bgr is None:
        raise RuntimeError(f"Unable to read {source}")
    mask = build_mask(bgr)
    alpha = Image.fromarray(mask, mode="L").filter(ImageFilter.GaussianBlur(radius=0.8))
    rgba = Image.fromarray(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGBA), mode="RGBA")
    rgba.putalpha(alpha)
    rgba_array = np.array(rgba)
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    hue, saturation, value = cv2.split(hsv)
    shadow_like = (
        (hue >= 70)
        & (hue <= 110)
        & (saturation <= 120)
        & (value >= 140)
        & (np.indices(mask.shape)[0] >= mask.shape[0] * 0.58)
        & (mask > 20)
    )
    shadow_alpha = rgba_array[:, :, 3].copy()
    rgba_array[shadow_like, :3] = np.array([94, 84, 75], dtype=np.uint8)
    rgba_array[shadow_like, 3] = (shadow_alpha[shadow_like] * 0.34).astype(np.uint8)
    rgba = Image.fromarray(rgba_array, mode="RGBA")
    bbox = alpha.point(lambda value: 255 if value > 12 else 0).getbbox()
    if bbox:
        pad = 14
        left = max(0, bbox[0] - pad)
        top = max(0, bbox[1] - pad)
        right = min(rgba.width, bbox[2] + pad)
        bottom = min(rgba.height, bbox[3] + pad)
        rgba = rgba.crop((left, top, right, bottom))
    destination.parent.mkdir(parents=True, exist_ok=True)
    rgba.save(destination, "PNG", optimize=True)


def main() -> None:
    for asset_id in ASSET_IDS:
        source = RAW / f"{asset_id}.png"
        destination = OUT / f"{asset_id}.png"
        save_cutout(source, destination)
        print(f"{asset_id}: {destination.stat().st_size} bytes")


if __name__ == "__main__":
    main()
