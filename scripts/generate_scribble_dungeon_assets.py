from __future__ import annotations

from math import ceil
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
TILESET_PATH = ROOT / ".tmp-assets" / "calciumtrice" / "tileset" / "unzipped" / "dungeon tileset calciumtrice simple.png"
WARRIOR_PATH = ROOT / ".tmp-assets" / "calciumtrice" / "warrior" / "warrior-spritesheet-calciumtrice.png"
SKELETON_PATH = ROOT / ".tmp-assets" / "calciumtrice" / "skeleton" / "skeleton-spritesheet-calciumtrice.png"
OUTPUT_DIR = ROOT / "public" / "code-research" / "calciumtrice-dungeon"

SCENE_SIZE = (1600, 900)
GRID = 16
FLOOR_SCALE = 4
SPRITE_SCALE = 4
FLOOR_TILE = GRID * FLOOR_SCALE
WALL_TILE_W = GRID * FLOOR_SCALE
WALL_TILE_H = GRID * 2 * FLOOR_SCALE


def load_rgba(path: Path) -> Image.Image:
    return Image.open(path).convert("RGBA")


def ensure_output() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def crop_grid(image: Image.Image, col: int, row: int, width: int = 1, height: int = 1) -> Image.Image:
    return image.crop((col * GRID, row * GRID, (col + width) * GRID, (row + height) * GRID))


def crop_frame(image: Image.Image, col: int, row: int, frame_size: int = 32) -> Image.Image:
    return image.crop((col * frame_size, row * frame_size, (col + 1) * frame_size, (row + 1) * frame_size))


def scale_nearest(image: Image.Image, factor: int) -> Image.Image:
    return image.resize((image.width * factor, image.height * factor), Image.Resampling.NEAREST)


def resize_nearest(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    return image.resize(size, Image.Resampling.NEAREST)


def trim_transparent(image: Image.Image) -> Image.Image:
    background = Image.new("RGBA", image.size, (0, 0, 0, 0))
    diff = ImageChops.difference(image, background)
    bbox = diff.getbbox()
    return image.crop(bbox) if bbox else image


def remove_near_white(image: Image.Image, threshold: int = 246) -> Image.Image:
    result = image.copy()
    pixels = result.load()
    for y in range(result.height):
        for x in range(result.width):
            red, green, blue, alpha = pixels[x, y]
            if alpha == 0:
                continue
            if red >= threshold and green >= threshold and blue >= threshold:
                pixels[x, y] = (0, 0, 0, 0)
    return trim_transparent(result)


def expand_alpha(alpha: Image.Image, amount: int) -> Image.Image:
    result = alpha
    for _ in range(amount):
        result = result.filter(ImageFilter.MaxFilter(3))
    return result


def add_outline(sprite: Image.Image, color: tuple[int, int, int, int], thickness: int = 2) -> Image.Image:
    sprite = trim_transparent(sprite)
    pad = thickness * 3
    canvas = Image.new("RGBA", (sprite.width + pad * 2, sprite.height + pad * 2), (0, 0, 0, 0))
    alpha = sprite.getchannel("A")
    outline_alpha = expand_alpha(alpha, thickness)
    outline = Image.new("RGBA", sprite.size, color)
    canvas.paste(outline, (pad, pad), outline_alpha)
    canvas.alpha_composite(sprite, (pad, pad))
    return trim_transparent(canvas)


def add_soft_glow(sprite: Image.Image, color: tuple[int, int, int, int], radius: int = 16) -> Image.Image:
    sprite = trim_transparent(sprite)
    pad = radius * 3
    canvas = Image.new("RGBA", (sprite.width + pad * 2, sprite.height + pad * 2), (0, 0, 0, 0))
    glow = Image.new("RGBA", sprite.size, color)
    glow.putalpha(sprite.getchannel("A"))
    blurred = glow.filter(ImageFilter.GaussianBlur(radius))
    canvas.alpha_composite(blurred, (pad, pad))
    canvas.alpha_composite(sprite, (pad, pad))
    return trim_transparent(canvas)


def shadow_ellipse(width: int, height: int, color: tuple[int, int, int, int]) -> Image.Image:
    shadow = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(shadow)
    draw.ellipse((0, 0, width - 1, height - 1), fill=color)
    return shadow.filter(ImageFilter.GaussianBlur(max(4, width // 10)))


def tint_pixel(
    pixel: tuple[int, int, int, int],
    target: tuple[int, int, int],
    strength: float,
) -> tuple[int, int, int, int]:
    red, green, blue, alpha = pixel
    if alpha == 0:
        return pixel
    return (
        int(red * (1 - strength) + target[0] * strength),
        int(green * (1 - strength) + target[1] * strength),
        int(blue * (1 - strength) + target[2] * strength),
        alpha,
    )


def recolor_armored_unit(
    sprite: Image.Image,
    *,
    armor_tint: tuple[int, int, int],
    accent_tint: tuple[int, int, int],
    weapon_tint: tuple[int, int, int],
) -> Image.Image:
    result = sprite.copy()
    pixels = result.load()
    for y in range(result.height):
        for x in range(result.width):
            red, green, blue, alpha = pixels[x, y]
            if alpha == 0:
                continue
            if abs(red - green) < 18 and abs(green - blue) < 18 and 28 <= red <= 190:
                pixels[x, y] = tint_pixel((red, green, blue, alpha), armor_tint, 0.42)
                continue
            if red > green * 1.08 and red > blue * 1.08 and red > 94:
                pixels[x, y] = tint_pixel((red, green, blue, alpha), accent_tint, 0.52)
                continue
            if blue > red * 1.08 and blue >= green and red > 86:
                pixels[x, y] = tint_pixel((red, green, blue, alpha), weapon_tint, 0.46)
    return result


def badge_on_prop(
    prop: Image.Image,
    badge: Image.Image,
    *,
    prop_scale: float = 1.0,
    badge_scale: float = 0.52,
    badge_offset: tuple[int, int] = (0, -18),
) -> Image.Image:
    prop = trim_transparent(prop)
    badge = trim_transparent(badge)

    if prop_scale != 1.0:
        prop = resize_nearest(prop, (max(1, int(prop.width * prop_scale)), max(1, int(prop.height * prop_scale))))
    if badge_scale != 1.0:
        badge = resize_nearest(badge, (max(1, int(badge.width * badge_scale)), max(1, int(badge.height * badge_scale))))

    width = max(prop.width, badge.width) + 40
    height = prop.height + badge.height + 30
    canvas = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    prop_x = (canvas.width - prop.width) // 2
    prop_y = canvas.height - prop.height - 10
    badge_x = (canvas.width - badge.width) // 2 + badge_offset[0]
    badge_y = max(0, prop_y - badge.height // 2 + badge_offset[1])
    canvas.alpha_composite(prop, (prop_x, prop_y))
    canvas.alpha_composite(badge, (badge_x, badge_y))
    return trim_transparent(canvas)


def sprite_to_token(
    sprite: Image.Image,
    *,
    canvas_size: tuple[int, int] = (128, 128),
    shadow_color: tuple[int, int, int, int] = (6, 6, 10, 110),
    glow_color: tuple[int, int, int, int] | None = None,
    lift: int = 6,
) -> Image.Image:
    sprite = trim_transparent(sprite)
    canvas = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    if glow_color:
        glow = add_soft_glow(sprite, glow_color, radius=12)
        glow_x = (canvas.width - glow.width) // 2
        glow_y = max(0, canvas.height - glow.height - 18 - lift)
        canvas.alpha_composite(glow, (glow_x, glow_y))

    shadow = shadow_ellipse(min(88, canvas.width - 10), 26, shadow_color)
    shadow_x = (canvas.width - shadow.width) // 2
    shadow_y = canvas.height - shadow.height - 6
    canvas.alpha_composite(shadow, (shadow_x, shadow_y))

    sprite_x = (canvas.width - sprite.width) // 2
    sprite_y = canvas.height - sprite.height - 14 - lift
    canvas.alpha_composite(sprite, (sprite_x, sprite_y))
    return canvas


def paste_midbottom(base: Image.Image, sprite: Image.Image, x: int, y: int) -> None:
    left = int(x - sprite.width / 2)
    top = int(y - sprite.height)
    base.alpha_composite(sprite, (left, top))


def paste_center(base: Image.Image, sprite: Image.Image, x: int, y: int) -> None:
    left = int(x - sprite.width / 2)
    top = int(y - sprite.height / 2)
    base.alpha_composite(sprite, (left, top))


def paint_floor_region(
    scene: Image.Image,
    tileset: Image.Image,
    *,
    x0: int,
    y0: int,
    cols: int,
    rows: int,
    variants: list[tuple[int, int]],
) -> None:
    for row in range(rows):
        for col in range(cols):
            coord = variants[(row * cols + col) % len(variants)]
            tile = scale_nearest(crop_grid(tileset, coord[0], coord[1]), FLOOR_SCALE)
            scene.alpha_composite(tile, (x0 + col * FLOOR_TILE, y0 + row * FLOOR_TILE))


def wall_strip(tileset: Image.Image, width: int, *, mirrored: bool = False) -> Image.Image:
    variants = [(0, 1), (1, 1), (2, 1), (3, 1), (4, 1), (5, 1), (6, 1)]
    strip = Image.new("RGBA", (width, WALL_TILE_H), (0, 0, 0, 0))
    for index, left in enumerate(range(0, width, WALL_TILE_W)):
        coord = variants[index % len(variants)]
        wall = scale_nearest(crop_grid(tileset, coord[0], coord[1], 1, 2), FLOOR_SCALE)
        strip.alpha_composite(wall, (left, 0))
    return strip.transpose(Image.Transpose.FLIP_TOP_BOTTOM) if mirrored else strip


def add_room_shading(scene: Image.Image) -> None:
    width, height = scene.size
    overlay = Image.new("RGBA", scene.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    draw.rectangle((0, 0, width, 180), fill=(7, 8, 12, 58))
    draw.rectangle((0, height - 190, width, height), fill=(6, 7, 10, 80))
    draw.rectangle((0, 0, 120, height), fill=(8, 8, 10, 42))
    draw.rectangle((width - 120, 0, width, height), fill=(8, 8, 10, 42))
    overlay = overlay.filter(ImageFilter.GaussianBlur(26))
    scene.alpha_composite(overlay)


def add_vignette(scene: Image.Image, strength: int = 112) -> None:
    width, height = scene.size
    vignette = Image.new("L", scene.size, 0)
    for y in range(height):
        for x in range(width):
            edge_x = min(x, width - x - 1)
            edge_y = min(y, height - y - 1)
            edge = min(edge_x, edge_y)
            value = max(0, strength - edge)
            vignette.putpixel((x, y), min(255, value))
    tint = Image.new("RGBA", scene.size, (6, 9, 13, 0))
    tint.putalpha(vignette.filter(ImageFilter.GaussianBlur(30)))
    scene.alpha_composite(tint)


def add_torch_glow(scene: Image.Image, x: int, y: int, radius: int = 150) -> None:
    glow = Image.new("RGBA", scene.size, (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=(255, 195, 88, 62))
    glow_draw.ellipse((x - radius // 2, y - radius // 2, x + radius // 2, y + radius // 2), fill=(255, 226, 156, 48))
    scene.alpha_composite(glow.filter(ImageFilter.GaussianBlur(28)))


def add_lane_highlight(scene: Image.Image, left: int, top: int, width: int, height: int) -> None:
    overlay = Image.new("RGBA", scene.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    draw.rounded_rectangle((left, top, left + width, top + height), radius=34, fill=(238, 214, 156, 18))
    draw.rounded_rectangle((left, top + 8, left + width, top + height + 10), radius=34, outline=(255, 238, 194, 18), width=4)
    scene.alpha_composite(overlay.filter(ImageFilter.GaussianBlur(16)))


def add_focus_rune(scene: Image.Image, x: int, y: int, color: tuple[int, int, int, int]) -> None:
    focus = Image.new("RGBA", scene.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(focus)
    draw.ellipse((x - 60, y - 18, x + 60, y + 18), outline=color, width=4)
    draw.ellipse((x - 34, y - 12, x + 34, y + 12), outline=(255, 248, 216, 64), width=3)
    draw.arc((x - 50, y - 24, x + 50, y + 24), 20, 160, fill=color, width=3)
    draw.arc((x - 50, y - 24, x + 50, y + 24), 200, 340, fill=color, width=3)
    scene.alpha_composite(focus.filter(ImageFilter.GaussianBlur(4)))


def add_floor_decals(scene: Image.Image, props: dict[str, Image.Image], positions: list[tuple[str, int, int]]) -> None:
    for name, x, y in positions:
        paste_center(scene, props[name], x, y)


def paint_floor_patch(
    scene: Image.Image,
    tileset: Image.Image,
    *,
    left: int,
    top: int,
    width: int,
    height: int,
    variants: list[tuple[int, int]],
) -> None:
    cols = ceil(width / FLOOR_TILE) + 1
    rows = ceil(height / FLOOR_TILE) + 1
    paint_floor_region(scene, tileset, x0=left, y0=top, cols=cols, rows=rows, variants=variants)


def add_floor_frame(
    scene: Image.Image,
    *,
    left: int,
    top: int,
    width: int,
    height: int,
    tint: tuple[int, int, int, int] = (250, 233, 190, 18),
) -> None:
    overlay = Image.new("RGBA", scene.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    draw.rounded_rectangle((left, top, left + width, top + height), radius=42, fill=tint)
    draw.rounded_rectangle((left + 10, top + 10, left + width - 10, top + height - 10), radius=34, outline=(255, 250, 224, 26), width=4)
    scene.alpha_composite(overlay.filter(ImageFilter.GaussianBlur(12)))


def cell_anchor(
    grid: dict[str, int],
    *,
    cols: int,
    rows: int,
    x: int,
    y: int,
) -> tuple[int, int]:
    cell_w = grid["width"] / max(1, cols - 1)
    cell_h = grid["height"] / max(1, rows - 1)
    return (
        int(grid["left"] + x * cell_w),
        int(grid["top"] + y * cell_h),
    )


def add_ruin_block(scene: Image.Image, x: int, y: int, *, width: int = 86, height: int = 106) -> None:
    block = Image.new("RGBA", scene.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(block)
    draw.rounded_rectangle((x - width // 2, y - height // 2, x + width // 2, y + height // 2), radius=18, fill=(84, 86, 98, 148), outline=(172, 176, 190, 64), width=3)
    draw.line((x - width // 3, y - 12, x + width // 3, y + 18), fill=(46, 50, 58, 110), width=6)
    scene.alpha_composite(block.filter(ImageFilter.GaussianBlur(2)))


def add_vertical_river(scene: Image.Image, *, x: int, top: int, bottom: int, width: int = 118) -> None:
    river = Image.new("RGBA", scene.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(river)
    left = x - width // 2
    right = x + width // 2
    draw.rounded_rectangle((left, top, right, bottom), radius=34, fill=(32, 76, 118, 176), outline=(138, 220, 255, 36), width=4)
    draw.rounded_rectangle((left + 12, top + 18, right - 12, bottom - 18), radius=28, fill=(18, 44, 82, 188))
    for ripple_y in range(top + 38, bottom - 18, 76):
        draw.arc((left + 18, ripple_y, right - 18, ripple_y + 28), 18, 162, fill=(168, 232, 255, 54), width=3)
    scene.alpha_composite(river.filter(ImageFilter.GaussianBlur(4)))


def add_bridge_shadow(scene: Image.Image, x: int, y: int) -> None:
    shadow = Image.new("RGBA", scene.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(shadow)
    draw.rounded_rectangle((x - 44, y - 14, x + 44, y + 14), radius=10, fill=(8, 10, 12, 72))
    scene.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(8)))


def add_floor_switch_glow(scene: Image.Image, x: int, y: int, *, on: bool = False) -> None:
    glow = Image.new("RGBA", scene.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(glow)
    outer = (255, 218, 110, 70) if on else (160, 188, 220, 54)
    inner = (255, 242, 182, 92) if on else (204, 222, 255, 62)
    draw.ellipse((x - 42, y - 22, x + 42, y + 22), fill=outer)
    draw.ellipse((x - 20, y - 10, x + 20, y + 10), fill=inner)
    scene.alpha_composite(glow.filter(ImageFilter.GaussianBlur(10)))


def add_fissure(scene: Image.Image, x: int, y: int, *, length: int = 88, angle: int = 0) -> None:
    crack = Image.new("RGBA", scene.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(crack)
    draw.line((x - length // 2, y, x + length // 2, y), fill=(220, 92, 86, 106), width=8)
    draw.line((x - 12, y - 16, x + 10, y + 18), fill=(255, 192, 155, 82), width=4)
    if angle:
        crack = crack.rotate(angle, resample=Image.Resampling.BICUBIC, center=(x, y))
    scene.alpha_composite(crack.filter(ImageFilter.GaussianBlur(4)))

def build_base_scene(tileset: Image.Image) -> Image.Image:
    scene = Image.new("RGBA", SCENE_SIZE, (14, 16, 20, 255))
    paint_floor_region(
        scene,
        tileset,
        x0=0,
        y0=0,
        cols=SCENE_SIZE[0] // FLOOR_TILE + 1,
        rows=SCENE_SIZE[1] // FLOOR_TILE + 1,
        variants=[(0, 6), (1, 6), (2, 6), (3, 6), (4, 6), (5, 6), (6, 6), (7, 6)],
    )
    paint_floor_region(
        scene,
        tileset,
        x0=0,
        y0=178,
        cols=SCENE_SIZE[0] // FLOOR_TILE + 1,
        rows=8,
        variants=[(0, 5), (1, 5), (2, 5), (3, 5), (4, 5), (5, 5), (6, 5), (7, 5)],
    )
    top_wall = wall_strip(tileset, SCENE_SIZE[0])
    bottom_wall = wall_strip(tileset, SCENE_SIZE[0], mirrored=True)
    scene.alpha_composite(top_wall, (0, 78))
    scene.alpha_composite(bottom_wall, (0, 652))
    add_room_shading(scene)
    scene.alpha_composite(Image.new("RGBA", scene.size, (28, 34, 46, 42)))
    return scene


def scale_prop(
    image: Image.Image,
    factor: int = FLOOR_SCALE,
    *,
    strip_white: bool = False,
    white_threshold: int = 248,
) -> Image.Image:
    if strip_white:
        return scale_nearest(remove_near_white(image, threshold=white_threshold), factor)
    return scale_nearest(image, factor)


def make_props(tileset: Image.Image) -> dict[str, Image.Image]:
    return {
        "banner_red": scale_prop(crop_grid(tileset, 19, 8, 1, 2), strip_white=True, white_threshold=252),
        "banner_blue": scale_prop(crop_grid(tileset, 21, 8, 1, 2), strip_white=True, white_threshold=252),
        "banner_black": scale_prop(crop_grid(tileset, 22, 8, 1, 2), strip_white=True, white_threshold=252),
        "torch": scale_prop(crop_grid(tileset, 11, 16), strip_white=True, white_threshold=252),
        "torch_tall": scale_prop(crop_grid(tileset, 13, 16), strip_white=True, white_threshold=252),
        "crate": scale_prop(crop_grid(tileset, 1, 16)),
        "chest": scale_prop(crop_grid(tileset, 2, 16)),
        "barrel": scale_prop(crop_grid(tileset, 4, 16)),
        "sack": scale_prop(crop_grid(tileset, 8, 16)),
        "stairs": scale_prop(crop_grid(tileset, 1, 12, 2, 2)),
        "gate": scale_prop(crop_grid(tileset, 13, 8, 2, 3)),
        "wood_gate": scale_prop(crop_grid(tileset, 4, 8, 2, 3)),
        "dust_blue": scale_prop(crop_grid(tileset, 6, 12)),
        "bones": scale_prop(crop_grid(tileset, 7, 12)),
        "dirt": scale_prop(crop_grid(tileset, 8, 12)),
    }


def draw_training_scene(tileset: Image.Image, props: dict[str, Image.Image]) -> Image.Image:
    scene = build_base_scene(tileset)
    lane_left = 208
    lane_top = 422
    lane_width = 1184
    lane_height = 84
    paint_floor_region(scene, tileset, x0=lane_left, y0=lane_top - 20, cols=19, rows=2, variants=[(0, 5), (1, 5), (2, 5), (3, 5), (4, 5), (5, 5), (6, 5), (7, 5)])
    add_lane_highlight(scene, lane_left + 18, lane_top - 4, lane_width - 36, lane_height + 22)

    paste_midbottom(scene, props["banner_red"], 292, 284)
    paste_midbottom(scene, props["banner_blue"], 1310, 286)
    paste_midbottom(scene, props["torch"], 458, 306)
    paste_midbottom(scene, props["torch"], 798, 306)
    paste_midbottom(scene, props["torch_tall"], 1140, 306)
    add_torch_glow(scene, 458, 290)
    add_torch_glow(scene, 798, 290)
    add_torch_glow(scene, 1140, 290)

    paste_midbottom(scene, props["crate"], 246, 686)
    paste_midbottom(scene, props["barrel"], 336, 686)
    paste_midbottom(scene, props["wood_gate"], 228, 360)
    paste_midbottom(scene, props["gate"], 1360, 360)
    paste_midbottom(scene, props["sack"], 1324, 688)
    paste_midbottom(scene, props["chest"], 1178, 670)
    paste_midbottom(scene, props["barrel"], 1118, 690)
    paste_midbottom(scene, props["crate"], 1238, 690)
    paste_midbottom(scene, props["chest"], 1038, 366)

    add_focus_rune(scene, 598, 506, (120, 214, 255, 124))
    add_focus_rune(scene, 1316, 512, (137, 235, 169, 118))
    add_floor_decals(
        scene,
        props,
        [
            ("bones", 424, 642),
            ("dust_blue", 880, 642),
            ("dirt", 1210, 352),
            ("bones", 1320, 350),
        ],
    )
    add_vignette(scene)
    return scene


def draw_patrol_scene(tileset: Image.Image, props: dict[str, Image.Image]) -> Image.Image:
    scene = build_base_scene(tileset)
    lane_left = 196
    lane_top = 426
    lane_width = 1210
    lane_height = 84
    paint_floor_region(scene, tileset, x0=lane_left, y0=lane_top - 18, cols=19, rows=2, variants=[(0, 5), (2, 5), (4, 5), (6, 5), (1, 5), (3, 5), (5, 5), (7, 5)])
    add_lane_highlight(scene, lane_left + 20, lane_top - 6, lane_width - 40, lane_height + 22)

    paste_midbottom(scene, props["gate"], 420, 356)
    paste_midbottom(scene, props["wood_gate"], 1174, 358)
    paste_midbottom(scene, props["banner_black"], 768, 290)
    paste_midbottom(scene, props["banner_red"], 1118, 290)
    paste_midbottom(scene, props["torch"], 598, 308)
    paste_midbottom(scene, props["torch_tall"], 950, 308)
    add_torch_glow(scene, 598, 292)
    add_torch_glow(scene, 950, 292)

    paste_midbottom(scene, props["crate"], 274, 694)
    paste_midbottom(scene, props["barrel"], 344, 694)
    paste_midbottom(scene, props["barrel"], 1286, 692)
    paste_midbottom(scene, props["sack"], 1160, 688)
    paste_midbottom(scene, props["crate"], 1206, 360)
    paste_midbottom(scene, props["chest"], 1008, 690)
    paste_midbottom(scene, props["barrel"], 930, 690)
    paste_midbottom(scene, props["wood_gate"], 146, 360)

    add_focus_rune(scene, 704, 510, (248, 146, 126, 112))
    add_focus_rune(scene, 876, 512, (255, 222, 140, 110))
    add_focus_rune(scene, 1384, 516, (112, 189, 255, 108))
    add_floor_decals(
        scene,
        props,
        [
            ("dirt", 518, 648),
            ("bones", 842, 648),
            ("dust_blue", 1048, 648),
            ("dirt", 1212, 364),
        ],
    )
    add_vignette(scene)
    return scene


def draw_loop_scene(tileset: Image.Image, props: dict[str, Image.Image]) -> Image.Image:
    scene = build_base_scene(tileset)
    lane_left = 180
    lane_top = 426
    lane_width = 1244
    lane_height = 84
    paint_floor_region(scene, tileset, x0=lane_left, y0=lane_top - 18, cols=20, rows=2, variants=[(1, 5), (3, 5), (5, 5), (7, 5), (0, 5), (2, 5), (4, 5), (6, 5)])
    add_lane_highlight(scene, lane_left + 18, lane_top - 6, lane_width - 36, lane_height + 24)

    paste_midbottom(scene, props["banner_blue"], 302, 284)
    paste_midbottom(scene, props["banner_red"], 1296, 284)
    paste_midbottom(scene, props["torch"], 454, 308)
    paste_midbottom(scene, props["torch_tall"], 1118, 308)
    add_torch_glow(scene, 454, 292)
    add_torch_glow(scene, 1118, 292)

    paste_midbottom(scene, props["gate"], 302, 358)
    paste_midbottom(scene, props["wood_gate"], 1302, 358)
    paste_midbottom(scene, props["crate"], 240, 692)
    paste_midbottom(scene, props["barrel"], 306, 692)
    paste_midbottom(scene, props["chest"], 1274, 694)
    paste_midbottom(scene, props["crate"], 1190, 690)
    paste_midbottom(scene, props["barrel"], 1210, 364)
    paste_midbottom(scene, props["sack"], 1110, 690)
    paste_midbottom(scene, props["chest"], 1000, 366)

    add_focus_rune(scene, 810, 512, (225, 194, 124, 108))
    add_focus_rune(scene, 1416, 516, (114, 189, 255, 110))
    add_floor_decals(
        scene,
        props,
        [
            ("bones", 672, 646),
            ("dust_blue", 944, 646),
            ("dirt", 812, 360),
            ("dirt", 812, 680),
        ],
    )
    add_vignette(scene)
    return scene


def draw_gate_scene(tileset: Image.Image, props: dict[str, Image.Image]) -> Image.Image:
    scene = build_base_scene(tileset)
    lane_left = 212
    lane_top = 490
    lane_width = 1110
    lane_height = 84
    paint_floor_region(scene, tileset, x0=lane_left, y0=lane_top - 18, cols=18, rows=2, variants=[(0, 5), (1, 5), (2, 5), (3, 5), (4, 5), (5, 5), (6, 5), (7, 5)])
    add_lane_highlight(scene, lane_left + 18, lane_top - 6, lane_width - 38, lane_height + 22)

    paste_midbottom(scene, props["banner_black"], 338, 288)
    paste_midbottom(scene, props["banner_red"], 786, 288)
    paste_midbottom(scene, props["banner_blue"], 1248, 288)
    paste_midbottom(scene, props["torch"], 516, 312)
    paste_midbottom(scene, props["torch_tall"], 1040, 310)
    add_torch_glow(scene, 516, 294)
    add_torch_glow(scene, 1040, 292)

    paste_midbottom(scene, props["wood_gate"], 732, 620)
    paste_midbottom(scene, props["crate"], 282, 706)
    paste_midbottom(scene, props["barrel"], 356, 706)
    paste_midbottom(scene, props["chest"], 1188, 704)
    paste_midbottom(scene, props["sack"], 1266, 706)
    paste_midbottom(scene, props["gate"], 228, 366)

    add_focus_rune(scene, 358, 572, (255, 212, 136, 110))
    add_focus_rune(scene, 732, 572, (173, 118, 255, 110))
    add_focus_rune(scene, 1294, 572, (112, 189, 255, 108))
    add_floor_decals(
        scene,
        props,
        [
            ("bones", 514, 690),
            ("dust_blue", 916, 692),
            ("dirt", 1084, 692),
            ("bones", 1210, 368),
        ],
    )
    add_vignette(scene)
    return scene


def draw_river_scene(tileset: Image.Image, props: dict[str, Image.Image]) -> Image.Image:
    scene = build_base_scene(tileset)
    grid = {"left": 270, "top": 248, "width": 1000, "height": 412}
    paint_floor_patch(scene, tileset, left=grid["left"] - 104, top=grid["top"] - 88, width=grid["width"] + 210, height=grid["height"] + 170, variants=[(0, 5), (1, 5), (2, 5), (3, 5), (4, 5), (5, 5), (6, 5), (7, 5)])
    add_floor_frame(scene, left=grid["left"] - 62, top=grid["top"] - 52, width=grid["width"] + 124, height=grid["height"] + 106, tint=(226, 236, 245, 16))

    river_x, river_top = cell_anchor(grid, cols=8, rows=6, x=4, y=1)
    _, river_bottom = cell_anchor(grid, cols=8, rows=6, x=4, y=4)
    add_vertical_river(scene, x=river_x, top=river_top - 72, bottom=river_bottom + 76, width=126)
    bridge_x, bridge_y = cell_anchor(grid, cols=8, rows=6, x=4, y=3)
    add_bridge_shadow(scene, bridge_x, bridge_y + 10)

    for wall_x, wall_y in ((2, 1), (2, 4)):
        anchor_x, anchor_y = cell_anchor(grid, cols=8, rows=6, x=wall_x, y=wall_y)
        paste_midbottom(scene, props["crate"], anchor_x, anchor_y + 34)
        paste_midbottom(scene, props["barrel"], anchor_x + 34, anchor_y + 34)

    paste_midbottom(scene, props["banner_blue"], 320, 288)
    paste_midbottom(scene, props["banner_black"], 1258, 286)
    paste_midbottom(scene, props["torch"], 482, 310)
    paste_midbottom(scene, props["torch_tall"], 1108, 308)
    add_torch_glow(scene, 482, 294)
    add_torch_glow(scene, 1108, 292)
    paste_midbottom(scene, props["sack"], 1212, 700)
    paste_midbottom(scene, props["crate"], 290, 698)
    paste_midbottom(scene, props["barrel"], 360, 698)
    paste_midbottom(scene, props["chest"], 1148, 700)
    add_focus_rune(scene, bridge_x, bridge_y + 2, (124, 218, 255, 116))
    add_floor_decals(scene, props, [("dust_blue", 890, 694), ("bones", 1184, 662), ("dirt", 276, 642)])
    add_vignette(scene)
    return scene


def draw_switch_scene(tileset: Image.Image, props: dict[str, Image.Image]) -> Image.Image:
    scene = build_base_scene(tileset)
    grid = {"left": 274, "top": 226, "width": 986, "height": 444}
    paint_floor_patch(scene, tileset, left=grid["left"] - 112, top=grid["top"] - 74, width=grid["width"] + 224, height=grid["height"] + 148, variants=[(1, 5), (3, 5), (5, 5), (7, 5), (0, 5), (2, 5), (4, 5), (6, 5)])
    add_floor_frame(scene, left=grid["left"] - 70, top=grid["top"] - 38, width=grid["width"] + 142, height=grid["height"] + 84)

    for wall_x, wall_y in ((3, 0), (3, 1), (3, 3), (5, 4)):
        anchor_x, anchor_y = cell_anchor(grid, cols=8, rows=6, x=wall_x, y=wall_y)
        add_ruin_block(scene, anchor_x, anchor_y + 18, width=82, height=108)

    switch_x, switch_y = cell_anchor(grid, cols=8, rows=6, x=1, y=1)
    add_floor_switch_glow(scene, switch_x, switch_y + 20)
    door_x, door_y = cell_anchor(grid, cols=8, rows=6, x=6, y=2)
    add_focus_rune(scene, door_x, door_y + 18, (118, 203, 255, 116))
    add_fissure(scene, *cell_anchor(grid, cols=8, rows=6, x=2, y=4), length=94, angle=12)

    paste_midbottom(scene, props["banner_black"], 348, 292)
    paste_midbottom(scene, props["banner_red"], 1248, 292)
    paste_midbottom(scene, props["torch"], 520, 312)
    paste_midbottom(scene, props["torch_tall"], 1060, 312)
    add_torch_glow(scene, 520, 294)
    add_torch_glow(scene, 1060, 294)
    paste_midbottom(scene, props["crate"], 278, 702)
    paste_midbottom(scene, props["barrel"], 352, 702)
    paste_midbottom(scene, props["chest"], 1160, 702)
    paste_midbottom(scene, props["sack"], 1238, 704)
    add_floor_decals(scene, props, [("bones", 930, 698), ("dust_blue", 1112, 694), ("dirt", 462, 668)])
    add_vignette(scene)
    return scene


def draw_scan_scene(tileset: Image.Image, props: dict[str, Image.Image]) -> Image.Image:
    scene = build_base_scene(tileset)
    grid = {"left": 230, "top": 214, "width": 1120, "height": 432}
    paint_floor_patch(scene, tileset, left=grid["left"] - 92, top=grid["top"] - 74, width=grid["width"] + 186, height=grid["height"] + 148, variants=[(0, 5), (2, 5), (4, 5), (6, 5), (1, 5), (3, 5), (5, 5), (7, 5)])
    add_floor_frame(scene, left=grid["left"] - 56, top=grid["top"] - 32, width=grid["width"] + 110, height=grid["height"] + 74, tint=(243, 228, 210, 16))

    for wall_x, wall_y in ((1, 1), (6, 4)):
        anchor_x, anchor_y = cell_anchor(grid, cols=9, rows=6, x=wall_x, y=wall_y)
        add_ruin_block(scene, anchor_x, anchor_y + 20, width=92, height=120)

    for crack_x, crack_y, angle in ((3, 2, 10), (4, 2, -6), (4, 3, 18)):
        anchor_x, anchor_y = cell_anchor(grid, cols=9, rows=6, x=crack_x, y=crack_y)
        add_fissure(scene, anchor_x, anchor_y + 18, length=102, angle=angle)

    rune_x, rune_y = cell_anchor(grid, cols=9, rows=6, x=2, y=4)
    add_focus_rune(scene, rune_x, rune_y + 18, (186, 154, 255, 120))
    exit_x, exit_y = cell_anchor(grid, cols=9, rows=6, x=8, y=1)
    add_focus_rune(scene, exit_x, exit_y + 18, (130, 214, 255, 118))

    paste_midbottom(scene, props["banner_black"], 350, 292)
    paste_midbottom(scene, props["banner_red"], 820, 292)
    paste_midbottom(scene, props["banner_blue"], 1258, 292)
    paste_midbottom(scene, props["torch"], 494, 314)
    paste_midbottom(scene, props["torch_tall"], 1082, 312)
    add_torch_glow(scene, 494, 294)
    add_torch_glow(scene, 1082, 294)
    paste_midbottom(scene, props["gate"], 274, 366)
    paste_midbottom(scene, props["chest"], 1186, 706)
    paste_midbottom(scene, props["crate"], 272, 706)
    paste_midbottom(scene, props["barrel"], 344, 706)
    add_floor_decals(scene, props, [("bones", 930, 700), ("dirt", 1106, 696), ("dust_blue", 1242, 678)])
    add_vignette(scene)
    return scene


def draw_capstone_scene(tileset: Image.Image, props: dict[str, Image.Image]) -> Image.Image:
    scene = build_base_scene(tileset)
    grid = {"left": 214, "top": 188, "width": 1140, "height": 504}
    paint_floor_patch(scene, tileset, left=grid["left"] - 90, top=grid["top"] - 76, width=grid["width"] + 182, height=grid["height"] + 150, variants=[(1, 5), (3, 5), (5, 5), (7, 5), (0, 5), (2, 5), (4, 5), (6, 5)])
    add_floor_frame(scene, left=grid["left"] - 54, top=grid["top"] - 34, width=grid["width"] + 108, height=grid["height"] + 68, tint=(226, 231, 250, 16))

    river_x, river_top = cell_anchor(grid, cols=9, rows=7, x=3, y=3)
    _, river_bottom = cell_anchor(grid, cols=9, rows=7, x=3, y=5)
    add_vertical_river(scene, x=river_x, top=river_top - 72, bottom=river_bottom + 78, width=118)
    bridge_x, bridge_y = cell_anchor(grid, cols=9, rows=7, x=3, y=4)
    add_bridge_shadow(scene, bridge_x, bridge_y + 12)
    add_fissure(scene, *cell_anchor(grid, cols=9, rows=7, x=5, y=4), length=96, angle=-8)

    for wall_x, wall_y in ((1, 1), (2, 1), (6, 5)):
        anchor_x, anchor_y = cell_anchor(grid, cols=9, rows=7, x=wall_x, y=wall_y)
        add_ruin_block(scene, anchor_x, anchor_y + 18, width=90, height=116)

    door_x, door_y = cell_anchor(grid, cols=9, rows=7, x=6, y=3)
    crystal_x, crystal_y = cell_anchor(grid, cols=9, rows=7, x=7, y=3)
    exit_x, exit_y = cell_anchor(grid, cols=9, rows=7, x=8, y=3)
    add_focus_rune(scene, door_x, door_y + 18, (255, 212, 144, 116))
    add_focus_rune(scene, crystal_x, crystal_y + 18, (134, 222, 255, 118))
    add_focus_rune(scene, exit_x, exit_y + 18, (120, 186, 255, 110))

    paste_midbottom(scene, props["banner_black"], 324, 290)
    paste_midbottom(scene, props["banner_red"], 790, 288)
    paste_midbottom(scene, props["banner_blue"], 1266, 288)
    paste_midbottom(scene, props["torch"], 488, 312)
    paste_midbottom(scene, props["torch_tall"], 1094, 312)
    add_torch_glow(scene, 488, 294)
    add_torch_glow(scene, 1094, 294)
    paste_midbottom(scene, props["gate"], 276, 364)
    paste_midbottom(scene, props["wood_gate"], 1322, 366)
    paste_midbottom(scene, props["chest"], 1168, 704)
    paste_midbottom(scene, props["crate"], 264, 704)
    paste_midbottom(scene, props["barrel"], 344, 704)
    add_floor_decals(scene, props, [("bones", 908, 706), ("dust_blue", 1104, 708), ("dirt", 1240, 688)])
    add_vignette(scene)
    return scene


def build_pixel_crystal(scale: int = 4) -> Image.Image:
    canvas = Image.new("RGBA", (24, 24), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    outline = (23, 32, 44, 255)
    light = (224, 255, 255, 255)
    mid = (127, 216, 255, 255)
    dark = (53, 151, 229, 255)
    shape = [(12, 2), (16, 8), (15, 17), (12, 22), (9, 17), (8, 8)]
    draw.polygon(shape, fill=mid)
    draw.line((12, 2, 12, 22), fill=light, width=1)
    draw.line((8, 8, 12, 22), fill=dark, width=1)
    draw.line((16, 8, 12, 22), fill=light, width=1)
    draw.polygon(shape, outline=outline)
    return scale_nearest(canvas, scale)


def build_pixel_key(scale: int = 4) -> Image.Image:
    canvas = Image.new("RGBA", (24, 24), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    outline = (60, 34, 14, 255)
    light = (255, 216, 146, 255)
    mid = (214, 145, 74, 255)
    dark = (136, 77, 33, 255)
    draw.ellipse((2, 6, 12, 16), fill=light, outline=outline)
    draw.ellipse((5, 9, 8, 12), fill=(0, 0, 0, 0), outline=outline)
    draw.rectangle((11, 9, 21, 13), fill=mid, outline=outline)
    draw.rectangle((18, 7, 20, 12), fill=mid, outline=outline)
    draw.rectangle((21, 9, 23, 16), fill=dark, outline=outline)
    draw.rectangle((16, 13, 19, 18), fill=dark, outline=outline)
    draw.line((12, 10, 20, 10), fill=light, width=1)
    return scale_nearest(canvas, scale)


def build_pixel_scroll(scale: int = 4) -> Image.Image:
    canvas = Image.new("RGBA", (24, 24), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    outline = (58, 40, 28, 255)
    paper = (246, 231, 190, 255)
    shadow = (210, 190, 150, 255)
    seal = (133, 82, 170, 255)
    draw.rounded_rectangle((3, 6, 20, 17), radius=2, fill=paper, outline=outline)
    draw.rectangle((5, 9, 18, 15), fill=shadow)
    draw.ellipse((1, 8, 6, 15), fill=paper, outline=outline)
    draw.ellipse((17, 8, 22, 15), fill=paper, outline=outline)
    draw.rectangle((10, 9, 14, 14), fill=seal, outline=outline)
    draw.line((6, 11, 17, 11), fill=(230, 215, 177, 255), width=1)
    return scale_nearest(canvas, scale)


def build_pixel_hazard(scale: int = 4) -> Image.Image:
    canvas = Image.new("RGBA", (24, 24), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    outline = (29, 18, 16, 255)
    metal = (143, 146, 158, 255)
    fire = (255, 174, 61, 255)
    ember = (255, 236, 171, 255)
    draw.rounded_rectangle((4, 14, 20, 19), radius=2, fill=metal, outline=outline)
    for x in (7, 11, 15):
        draw.polygon([(x, 15), (x + 2, 9), (x + 4, 15)], fill=metal, outline=outline)
    draw.polygon([(11, 13), (13, 8), (16, 13)], fill=fire, outline=outline)
    draw.point((13, 10), fill=ember)
    return scale_nearest(canvas, scale)


def build_pixel_exit(scale: int = 4) -> Image.Image:
    canvas = Image.new("RGBA", (24, 24), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    outline = (24, 30, 44, 255)
    stone = (108, 109, 131, 255)
    shadow = (70, 72, 94, 255)
    glow = (113, 220, 255, 255)
    glow_soft = (198, 244, 255, 255)
    draw.rectangle((6, 5, 8, 20), fill=stone, outline=outline)
    draw.rectangle((15, 5, 17, 20), fill=stone, outline=outline)
    draw.rectangle((8, 4, 15, 7), fill=stone, outline=outline)
    draw.rounded_rectangle((9, 8, 14, 18), radius=2, fill=glow, outline=outline)
    draw.line((10, 17, 12, 12), fill=glow_soft, width=1)
    draw.line((12, 12, 13, 10), fill=glow_soft, width=1)
    draw.rectangle((10, 20, 13, 21), fill=shadow, outline=outline)
    return scale_nearest(canvas, scale)


def build_pixel_door(opened: bool, scale: int = 4) -> Image.Image:
    canvas = Image.new("RGBA", (24, 24), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    outline = (30, 20, 14, 255)
    frame = (132, 96, 62, 255)
    light = (182, 136, 88, 255)
    dark = (80, 50, 30, 255)
    opening = (20, 17, 22, 255)
    draw.rectangle((5, 4, 7, 21), fill=frame, outline=outline)
    draw.rectangle((16, 4, 18, 21), fill=frame, outline=outline)
    draw.rectangle((7, 3, 16, 6), fill=light, outline=outline)
    if opened:
        draw.rounded_rectangle((9, 7, 14, 20), radius=2, fill=opening, outline=outline)
        draw.rectangle((6, 8, 8, 19), fill=frame, outline=outline)
        draw.line((6, 9, 8, 8), fill=light, width=1)
        draw.line((6, 13, 8, 12), fill=light, width=1)
    else:
        draw.rounded_rectangle((9, 7, 14, 20), radius=2, fill=frame, outline=outline)
        draw.line((11, 8, 11, 18), fill=dark, width=1)
        draw.line((13, 8, 13, 18), fill=dark, width=1)
        draw.ellipse((12, 13, 13, 14), fill=light, outline=outline)
    return scale_nearest(canvas, scale)


def build_pixel_planks(scale: int = 4) -> Image.Image:
    canvas = Image.new("RGBA", (24, 24), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    outline = (64, 38, 18, 255)
    wood_light = (205, 150, 92, 255)
    wood_dark = (137, 88, 48, 255)
    rope = (228, 210, 156, 255)
    for offset in (6, 10, 14):
        draw.rectangle((4, offset, 19, offset + 2), fill=wood_light, outline=outline)
        draw.line((6, offset + 1, 17, offset + 1), fill=wood_dark, width=1)
    draw.rectangle((8, 5, 9, 18), fill=rope, outline=outline)
    draw.rectangle((14, 5, 15, 18), fill=rope, outline=outline)
    return scale_nearest(canvas, scale)


def build_pixel_bridge(built: bool, scale: int = 4) -> Image.Image:
    canvas = Image.new("RGBA", (24, 24), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    outline = (36, 24, 16, 255)
    rope = (214, 200, 156, 255)
    wood_light = (184, 130, 78, 255)
    wood_dark = (120, 76, 40, 255)
    gap = (15, 27, 42, 255)
    draw.rounded_rectangle((2, 12, 21, 17), radius=2, fill=gap if not built else wood_dark, outline=outline)
    draw.rectangle((3, 8, 5, 18), fill=wood_dark, outline=outline)
    draw.rectangle((18, 8, 20, 18), fill=wood_dark, outline=outline)
    draw.line((5, 10, 18, 10), fill=rope, width=1)
    draw.line((5, 16, 18, 16), fill=rope, width=1)
    if built:
        for x in (6, 10, 14):
            draw.rectangle((x, 11, x + 2, 17), fill=wood_light, outline=outline)
    else:
        draw.rectangle((11, 11, 13, 17), fill=(24, 38, 58, 255), outline=outline)
    return scale_nearest(canvas, scale)


def build_pixel_switch(on: bool, scale: int = 4) -> Image.Image:
    canvas = Image.new("RGBA", (24, 24), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    outline = (32, 34, 38, 255)
    stone = (124, 130, 146, 255)
    glow = (255, 212, 96, 255) if on else (164, 188, 220, 255)
    draw.rounded_rectangle((3, 9, 21, 19), radius=3, fill=stone, outline=outline)
    draw.ellipse((8, 6, 16, 14), fill=glow, outline=outline)
    draw.line((12, 6, 12, 13), fill=glow, width=1)
    draw.line((5, 16, 19, 16), fill=(84, 90, 106, 255), width=1)
    return scale_nearest(canvas, scale)


def build_pixel_bug(scale: int = 4) -> Image.Image:
    canvas = Image.new("RGBA", (24, 24), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    outline = (32, 22, 24, 255)
    shell = (123, 82, 164, 255)
    shell_light = (183, 148, 224, 255)
    legs = (72, 50, 68, 255)
    draw.ellipse((7, 8, 17, 18), fill=shell, outline=outline)
    draw.ellipse((10, 5, 14, 10), fill=shell_light, outline=outline)
    draw.line((8, 10, 4, 7), fill=legs, width=1)
    draw.line((8, 14, 4, 17), fill=legs, width=1)
    draw.line((16, 10, 20, 7), fill=legs, width=1)
    draw.line((16, 14, 20, 17), fill=legs, width=1)
    draw.line((12, 9, 12, 17), fill=shell_light, width=1)
    return scale_nearest(canvas, scale)


def build_pixel_coin(scale: int = 4) -> Image.Image:
    canvas = Image.new("RGBA", (24, 24), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    outline = (76, 42, 14, 255)
    gold = (245, 196, 66, 255)
    glow = (255, 235, 155, 255)
    shadow = (190, 132, 48, 255)
    draw.ellipse((5, 6, 19, 18), fill=gold, outline=outline)
    draw.ellipse((8, 9, 16, 15), fill=glow, outline=outline)
    draw.arc((6, 7, 18, 17), 42, 220, fill=shadow, width=1)
    return scale_nearest(canvas, scale)


def build_pixel_potion(scale: int = 4) -> Image.Image:
    canvas = Image.new("RGBA", (24, 24), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    outline = (42, 20, 52, 255)
    glass = (174, 216, 235, 255)
    cork = (130, 93, 52, 255)
    brew = (138, 82, 194, 255)
    brew_glow = (203, 168, 244, 255)
    draw.rectangle((10, 4, 14, 6), fill=cork, outline=outline)
    draw.rectangle((9, 6, 15, 8), fill=glass, outline=outline)
    draw.rounded_rectangle((6, 8, 18, 20), radius=4, fill=glass, outline=outline)
    draw.rounded_rectangle((7, 12, 17, 19), radius=3, fill=brew, outline=outline)
    draw.line((9, 14, 14, 18), fill=brew_glow, width=1)
    draw.point((11, 11), fill=brew_glow)
    draw.point((13, 10), fill=brew_glow)
    return scale_nearest(canvas, scale)


def export_sprite(
    image: Image.Image,
    output_name: str,
    *,
    glow: tuple[int, int, int, int] | None = None,
    lift: int = 6,
    canvas_size: tuple[int, int] = (128, 128),
) -> None:
    ensure_output()
    token = sprite_to_token(image, glow_color=glow, lift=lift, canvas_size=canvas_size)
    token.save(OUTPUT_DIR / output_name)


def export_plain_sprite(
    image: Image.Image,
    output_name: str,
    *,
    canvas_size: tuple[int, int] = (96, 96),
    margin: int = 6,
) -> None:
    ensure_output()
    sprite = trim_transparent(image)
    max_width = max(1, canvas_size[0] - margin * 2)
    max_height = max(1, canvas_size[1] - margin * 2)
    scale = min(max_width / max(1, sprite.width), max_height / max(1, sprite.height), 1.0)
    if scale < 1:
        sprite = resize_nearest(sprite, (max(1, int(sprite.width * scale)), max(1, int(sprite.height * scale))))
    canvas = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    x = (canvas.width - sprite.width) // 2
    y = (canvas.height - sprite.height) // 2
    canvas.alpha_composite(sprite, (x, y))
    canvas.save(OUTPUT_DIR / output_name)


def export_scene(scene: Image.Image, name: str) -> None:
    ensure_output()
    scene.save(OUTPUT_DIR / name)


def export_scenes() -> None:
    tileset = load_rgba(TILESET_PATH)
    props = make_props(tileset)
    export_scene(draw_training_scene(tileset, props), "scene-training-hall-v2.png")
    export_scene(draw_patrol_scene(tileset, props), "scene-guard-corridor-v2.png")
    export_scene(draw_loop_scene(tileset, props), "scene-loop-gallery-v2.png")
    export_scene(draw_gate_scene(tileset, props), "scene-bronze-gate-v2.png")
    export_scene(draw_river_scene(tileset, props), "scene-river-crossing-v1.png")
    export_scene(draw_switch_scene(tileset, props), "scene-switch-sanctum-v1.png")
    export_scene(draw_scan_scene(tileset, props), "scene-scan-ruins-v1.png")
    export_scene(draw_capstone_scene(tileset, props), "scene-terminal-temple-v1.png")


def export_sprites() -> None:
    tileset = load_rgba(TILESET_PATH)
    warrior = load_rgba(WARRIOR_PATH)
    props = make_props(tileset)

    hero_base = scale_nearest(crop_frame(warrior, 0, 0), SPRITE_SCALE)
    guard_base = scale_nearest(crop_frame(warrior, 4, 0), SPRITE_SCALE)
    sentinel_base = scale_nearest(crop_frame(warrior, 4, 3), SPRITE_SCALE)

    hero = add_outline(hero_base, (13, 14, 18, 255), thickness=2)
    guard = add_outline(
        recolor_armored_unit(
            guard_base,
            armor_tint=(96, 88, 108),
            accent_tint=(185, 74, 78),
            weapon_tint=(188, 122, 158),
        ),
        (18, 16, 24, 255),
        thickness=2,
    )
    sentinel = add_outline(
        recolor_armored_unit(
            sentinel_base,
            armor_tint=(78, 92, 118),
            accent_tint=(90, 196, 224),
            weapon_tint=(118, 220, 255),
        ),
        (14, 18, 28, 255),
        thickness=2,
    )
    torch = add_outline(scale_nearest(remove_near_white(crop_grid(tileset, 11, 17), threshold=232), SPRITE_SCALE), (17, 14, 10, 255), thickness=1)

    export_sprite(hero, "hero-guide-v2.png")
    export_sprite(guard, "guard-red-v2.png", glow=(228, 128, 146, 34), lift=4)
    export_sprite(sentinel, "sentinel-blue-v1.png", glow=(112, 214, 255, 38), lift=4)
    export_plain_sprite(hero, "hero-guide-v3.png", canvas_size=(112, 112), margin=2)
    export_plain_sprite(guard, "guard-red-v3.png", canvas_size=(112, 112), margin=2)
    export_plain_sprite(sentinel, "sentinel-blue-v2.png", canvas_size=(112, 112), margin=2)
    export_sprite(build_pixel_exit(), "stairs-exit-v2.png", glow=(110, 205, 255, 42), lift=8, canvas_size=(112, 112))
    export_sprite(build_pixel_door(False), "door-closed-v2.png", glow=(255, 208, 140, 20), lift=7, canvas_size=(112, 112))
    export_sprite(build_pixel_door(True), "door-open-v2.png", glow=(126, 212, 255, 28), lift=7, canvas_size=(112, 112))
    export_sprite(torch, "torch-decor-v2.png", glow=(255, 181, 77, 52), lift=2)

    export_sprite(build_pixel_crystal(scale=4), "chest-crystal-v2.png", glow=(84, 214, 255, 64), lift=8)
    export_plain_sprite(build_pixel_key(scale=4), "barrel-key-v2.png", canvas_size=(96, 96))
    export_plain_sprite(build_pixel_scroll(scale=4), "crate-scroll-v2.png", canvas_size=(96, 96))
    key_badge = add_outline(build_pixel_key(scale=3), (64, 40, 16, 255), thickness=1)
    scroll_badge = add_outline(build_pixel_scroll(scale=3), (72, 48, 24, 255), thickness=1)
    barrel_key = badge_on_prop(props["barrel"], key_badge, prop_scale=1.1, badge_scale=0.68, badge_offset=(0, -8))
    crate_scroll = badge_on_prop(props["crate"], scroll_badge, prop_scale=1.1, badge_scale=0.62, badge_offset=(0, -8))
    export_plain_sprite(barrel_key, "barrel-key-v3.png", canvas_size=(112, 112), margin=2)
    export_plain_sprite(crate_scroll, "crate-scroll-v3.png", canvas_size=(112, 112), margin=2)
    export_sprite(build_pixel_hazard(), "trap-hazard-v2.png", glow=(255, 142, 80, 40), lift=8)
    export_sprite(build_pixel_planks(), "plank-bundle-v1.png", glow=(255, 210, 138, 30), lift=8)
    export_plain_sprite(build_pixel_planks(scale=4), "plank-bundle-v2.png", canvas_size=(112, 112), margin=2)
    export_sprite(build_pixel_bridge(False), "bridge-broken-v1.png", glow=(80, 160, 216, 18), lift=8)
    export_sprite(build_pixel_bridge(True), "bridge-built-v1.png", glow=(112, 214, 255, 24), lift=8)
    export_plain_sprite(build_pixel_bridge(False, scale=4), "bridge-broken-v2.png", canvas_size=(112, 112), margin=2)
    export_plain_sprite(build_pixel_bridge(True, scale=4), "bridge-built-v2.png", canvas_size=(112, 112), margin=2)
    export_plain_sprite(build_pixel_switch(False, scale=4), "switch-off-v1.png", canvas_size=(96, 96))
    export_plain_sprite(build_pixel_switch(True, scale=4), "switch-on-v1.png", canvas_size=(96, 96))
    switch_off = badge_on_prop(props["dirt"], build_pixel_switch(False, scale=3), prop_scale=1.12, badge_scale=0.7, badge_offset=(0, -7))
    switch_on = badge_on_prop(props["dirt"], build_pixel_switch(True, scale=3), prop_scale=1.12, badge_scale=0.7, badge_offset=(0, -7))
    export_plain_sprite(switch_off, "switch-off-v2.png", canvas_size=(112, 112), margin=2)
    export_plain_sprite(switch_on, "switch-on-v2.png", canvas_size=(112, 112), margin=2)
    export_sprite(build_pixel_bug(), "bug-purple-v1.png", glow=(214, 164, 255, 30), lift=8)
    export_plain_sprite(build_pixel_bug(scale=4), "bug-purple-v2.png", canvas_size=(112, 112), margin=2)
    export_plain_sprite(build_pixel_coin(scale=4), "coin-cache-v1.png", canvas_size=(112, 112), margin=2)
    export_plain_sprite(build_pixel_potion(scale=4), "potion-v1.png", canvas_size=(112, 112), margin=2)


def main() -> None:
    export_scenes()
    export_sprites()


if __name__ == "__main__":
    main()
