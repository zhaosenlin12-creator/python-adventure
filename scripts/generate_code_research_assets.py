from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw


ROOT = Path(r"C:\kaifa\Obsidian\senlin-kaifa\game-google\public\code-research\sprites")
SIZE = 128


def make_canvas() -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    return image, ImageDraw.Draw(image)


def ellipse(draw: ImageDraw.ImageDraw, box, fill, outline=None, width=1):
    draw.ellipse(box, fill=fill, outline=outline, width=width)


def rounded(draw: ImageDraw.ImageDraw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def polygon(draw: ImageDraw.ImageDraw, points, fill, outline=None, width=1):
    draw.polygon(points, fill=fill, outline=outline)
    if outline:
      draw.line(points + [points[0]], fill=outline, width=width)


def save(image: Image.Image, filename: str):
    ROOT.mkdir(parents=True, exist_ok=True)
    image.save(ROOT / filename)


def hero():
    image, draw = make_canvas()
    ellipse(draw, (18, 96, 110, 118), (18, 26, 42, 90))
    polygon(draw, [(42, 26), (64, 14), (86, 26), (94, 68), (64, 104), (34, 68)], (44, 122, 88, 255), (15, 58, 44, 255), 3)
    rounded(draw, (45, 42, 83, 92), 16, (241, 159, 68, 255), (129, 71, 20, 255), 3)
    ellipse(draw, (44, 14, 84, 48), (248, 202, 134, 255), (129, 71, 20, 255), 3)
    polygon(draw, [(40, 26), (50, 12), (80, 12), (90, 26), (74, 22), (54, 22)], (34, 50, 84, 255), (16, 24, 38, 255), 3)
    rounded(draw, (83, 45, 98, 98), 7, (220, 232, 245, 255), (57, 67, 89, 255), 2)
    polygon(draw, [(89, 97), (104, 110), (97, 116), (84, 101)], (255, 221, 112, 255), (160, 109, 27, 255), 2)
    rounded(draw, (34, 90, 50, 108), 7, (84, 48, 24, 255))
    rounded(draw, (78, 90, 94, 108), 7, (84, 48, 24, 255))
    save(image, "hero-adventurer.png")


def guard():
    image, draw = make_canvas()
    ellipse(draw, (18, 98, 110, 118), (20, 22, 26, 90))
    polygon(draw, [(40, 30), (63, 16), (88, 30), (98, 76), (64, 102), (30, 76)], (177, 184, 196, 255), (74, 79, 91, 255), 3)
    ellipse(draw, (46, 24, 82, 56), (228, 232, 236, 255), (80, 84, 95, 255), 3)
    ellipse(draw, (52, 35, 60, 43), (44, 47, 54, 255))
    ellipse(draw, (68, 35, 76, 43), (44, 47, 54, 255))
    rounded(draw, (47, 58, 81, 95), 10, (212, 216, 220, 255), (84, 88, 98, 255), 3)
    rounded(draw, (24, 48, 42, 88), 9, (118, 129, 148, 255), (68, 76, 92, 255), 3)
    rounded(draw, (86, 48, 104, 88), 9, (118, 129, 148, 255), (68, 76, 92, 255), 3)
    save(image, "enemy-guard.png")


def bug():
    image, draw = make_canvas()
    ellipse(draw, (18, 98, 110, 118), (10, 14, 18, 86))
    ellipse(draw, (36, 36, 92, 88), (55, 124, 88, 255), (18, 78, 53, 255), 4)
    ellipse(draw, (48, 18, 80, 46), (96, 176, 120, 255), (24, 88, 58, 255), 3)
    ellipse(draw, (52, 28, 58, 34), (20, 32, 28, 255))
    ellipse(draw, (70, 28, 76, 34), (20, 32, 28, 255))
    for y in (42, 56, 70):
        draw.line((24, y, 40, y - 6), fill=(20, 42, 30, 255), width=4)
        draw.line((88, y - 6, 104, y), fill=(20, 42, 30, 255), width=4)
    draw.line((54, 18, 42, 4), fill=(53, 90, 64, 255), width=3)
    draw.line((74, 18, 86, 4), fill=(53, 90, 64, 255), width=3)
    save(image, "enemy-bug.png")


def sentinel():
    image, draw = make_canvas()
    ellipse(draw, (18, 98, 110, 118), (20, 14, 10, 90))
    polygon(draw, [(44, 24), (64, 12), (84, 24), (96, 82), (64, 106), (32, 82)], (194, 105, 44, 255), (94, 40, 16, 255), 4)
    rounded(draw, (44, 42, 84, 94), 10, (241, 170, 64, 255), (120, 63, 18, 255), 3)
    ellipse(draw, (48, 18, 80, 46), (255, 206, 118, 255), (131, 76, 18, 255), 3)
    ellipse(draw, (55, 28, 61, 34), (123, 31, 24, 255))
    ellipse(draw, (67, 28, 73, 34), (123, 31, 24, 255))
    polygon(draw, [(20, 64), (42, 46), (42, 82)], (100, 54, 22, 255), (60, 32, 12, 255), 3)
    polygon(draw, [(108, 64), (86, 46), (86, 82)], (100, 54, 22, 255), (60, 32, 12, 255), 3)
    save(image, "enemy-sentinel.png")


def slime():
    image, draw = make_canvas()
    ellipse(draw, (18, 100, 110, 118), (14, 22, 24, 80))
    rounded(draw, (28, 36, 100, 96), 28, (92, 190, 146, 255), (26, 104, 75, 255), 4)
    ellipse(draw, (42, 48, 58, 64), (26, 56, 44, 255))
    ellipse(draw, (70, 48, 86, 64), (26, 56, 44, 255))
    draw.arc((46, 58, 82, 82), start=20, end=160, fill=(26, 56, 44, 255), width=3)
    save(image, "enemy-slime.png")


def crystal():
    image, draw = make_canvas()
    ellipse(draw, (24, 96, 104, 114), (10, 22, 42, 80))
    polygon(draw, [(64, 12), (98, 40), (90, 88), (64, 108), (34, 86), (26, 40)], (63, 204, 255, 255), (17, 89, 132, 255), 4)
    polygon(draw, [(64, 18), (82, 42), (64, 100), (46, 42)], (189, 241, 255, 200))
    save(image, "item-crystal.png")


def key():
    image, draw = make_canvas()
    ellipse(draw, (18, 96, 110, 116), (38, 30, 8, 70))
    ellipse(draw, (20, 28, 66, 74), (255, 216, 88, 255), (158, 103, 21, 255), 4)
    ellipse(draw, (32, 40, 54, 62), (0, 0, 0, 0), (158, 103, 21, 255), 4)
    rounded(draw, (54, 44, 102, 58), 7, (255, 216, 88, 255), (158, 103, 21, 255), 3)
    rounded(draw, (88, 54, 98, 84), 4, (255, 216, 88, 255), (158, 103, 21, 255), 3)
    rounded(draw, (72, 54, 82, 76), 4, (255, 216, 88, 255), (158, 103, 21, 255), 3)
    save(image, "item-key.png")


def scroll():
    image, draw = make_canvas()
    ellipse(draw, (24, 98, 104, 116), (28, 18, 10, 80))
    rounded(draw, (26, 30, 102, 90), 14, (250, 233, 182, 255), (133, 91, 44, 255), 4)
    rounded(draw, (16, 36, 32, 84), 8, (177, 114, 62, 255), (106, 67, 36, 255), 3)
    rounded(draw, (96, 36, 112, 84), 8, (177, 114, 62, 255), (106, 67, 36, 255), 3)
    draw.line((44, 46, 84, 46), fill=(130, 84, 38, 255), width=3)
    draw.line((44, 60, 84, 60), fill=(130, 84, 38, 255), width=3)
    draw.line((44, 74, 74, 74), fill=(130, 84, 38, 255), width=3)
    save(image, "item-scroll.png")


def coin():
    image, draw = make_canvas()
    ellipse(draw, (20, 94, 108, 118), (30, 22, 6, 80))
    ellipse(draw, (24, 24, 104, 104), (255, 207, 72, 255), (153, 94, 18, 255), 5)
    ellipse(draw, (38, 38, 90, 90), (255, 230, 143, 255), (183, 136, 34, 255), 3)
    draw.line((64, 42, 64, 86), fill=(183, 136, 34, 255), width=4)
    draw.arc((48, 42, 84, 62), start=180, end=360, fill=(183, 136, 34, 255), width=4)
    draw.arc((44, 64, 80, 86), start=0, end=180, fill=(183, 136, 34, 255), width=4)
    save(image, "item-coin.png")


def plank():
    image, draw = make_canvas()
    ellipse(draw, (18, 98, 110, 118), (22, 14, 10, 76))
    rounded(draw, (22, 34, 106, 58), 8, (163, 107, 58, 255), (96, 59, 27, 255), 3)
    rounded(draw, (18, 56, 102, 80), 8, (184, 124, 69, 255), (110, 67, 29, 255), 3)
    rounded(draw, (24, 78, 108, 102), 8, (143, 92, 49, 255), (82, 50, 22, 255), 3)
    for x in (40, 66, 90):
        ellipse(draw, (x, 46, x + 6, 52), (78, 52, 24, 255))
        ellipse(draw, (x - 4, 68, x + 2, 74), (78, 52, 24, 255))
        ellipse(draw, (x + 2, 88, x + 8, 94), (78, 52, 24, 255))
    save(image, "item-plank.png")


def potion():
    image, draw = make_canvas()
    ellipse(draw, (24, 100, 104, 118), (26, 18, 40, 80))
    rounded(draw, (48, 12, 80, 34), 8, (119, 82, 40, 255), (72, 47, 18, 255), 3)
    rounded(draw, (34, 28, 94, 102), 20, (180, 92, 255, 255), (96, 36, 146, 255), 4)
    ellipse(draw, (42, 42, 86, 92), (233, 190, 255, 180))
    draw.line((44, 62, 84, 62), fill=(255, 239, 255, 200), width=4)
    save(image, "item-potion.png")


def exit_door():
    image, draw = make_canvas()
    ellipse(draw, (20, 98, 108, 118), (10, 34, 22, 90))
    rounded(draw, (28, 16, 100, 108), 18, (38, 181, 108, 255), (18, 92, 56, 255), 4)
    rounded(draw, (40, 32, 88, 96), 12, (24, 124, 74, 255), (17, 76, 46, 255), 3)
    ellipse(draw, (78, 60, 86, 68), (255, 220, 112, 255))
    save(image, "tile-exit.png")


def door_closed():
    image, draw = make_canvas()
    ellipse(draw, (20, 98, 108, 118), (18, 14, 10, 92))
    rounded(draw, (28, 16, 100, 110), 18, (116, 78, 44, 255), (57, 36, 18, 255), 4)
    for x in (46, 64, 82):
        draw.line((x, 24, x, 102), fill=(84, 55, 28, 255), width=3)
    ellipse(draw, (78, 62, 88, 72), (231, 184, 93, 255))
    rounded(draw, (44, 46, 70, 74), 7, (46, 54, 66, 255), (20, 28, 36, 255), 3)
    save(image, "tile-door-closed.png")


def door_open():
    image, draw = make_canvas()
    ellipse(draw, (20, 98, 108, 118), (18, 14, 10, 92))
    rounded(draw, (34, 16, 92, 110), 18, (72, 201, 234, 255), (20, 106, 138, 255), 4)
    polygon(draw, [(52, 26), (80, 18), (80, 108), (52, 100)], (18, 70, 88, 255), (12, 40, 52, 255), 3)
    ellipse(draw, (70, 62, 78, 70), (255, 236, 190, 255))
    save(image, "tile-door-open.png")


def bridge_broken():
    image, draw = make_canvas()
    ellipse(draw, (18, 98, 110, 118), (8, 20, 36, 80))
    rounded(draw, (18, 52, 52, 76), 8, (140, 93, 52, 255), (88, 56, 24, 255), 3)
    rounded(draw, (74, 52, 108, 76), 8, (140, 93, 52, 255), (88, 56, 24, 255), 3)
    draw.line((52, 58, 72, 70), fill=(56, 170, 212, 255), width=7)
    save(image, "tile-bridge-broken.png")


def bridge_built():
    image, draw = make_canvas()
    ellipse(draw, (18, 98, 110, 118), (8, 20, 36, 80))
    for y in (44, 58, 72):
        rounded(draw, (16, y, 110, y + 14), 6, (157, 108, 62, 255), (89, 58, 24, 255), 3)
    save(image, "tile-bridge-built.png")


def switch_off():
    image, draw = make_canvas()
    ellipse(draw, (24, 94, 104, 116), (10, 16, 22, 80))
    rounded(draw, (28, 54, 100, 96), 18, (73, 85, 104, 255), (22, 31, 44, 255), 4)
    ellipse(draw, (48, 38, 80, 70), (165, 175, 194, 255), (63, 76, 93, 255), 4)
    save(image, "tile-switch-off.png")


def switch_on():
    image, draw = make_canvas()
    ellipse(draw, (24, 94, 104, 116), (44, 38, 8, 90))
    rounded(draw, (28, 54, 100, 96), 18, (160, 125, 18, 255), (94, 70, 10, 255), 4)
    ellipse(draw, (44, 34, 84, 74), (255, 224, 92, 255), (151, 114, 14, 255), 4)
    ellipse(draw, (52, 42, 76, 66), (255, 247, 184, 255))
    save(image, "tile-switch-on.png")


def hazard():
    image, draw = make_canvas()
    ellipse(draw, (16, 96, 112, 118), (34, 8, 14, 96))
    polygon(draw, [(42, 18), (60, 44), (48, 62), (70, 90), (54, 112), (84, 74), (72, 56), (90, 20), (66, 36)], (255, 100, 108, 255), (132, 22, 30, 255), 4)
    save(image, "tile-hazard.png")


def rune():
    image, draw = make_canvas()
    ellipse(draw, (16, 96, 112, 118), (64, 46, 12, 78))
    ellipse(draw, (24, 24, 104, 104), (237, 204, 110, 255), (145, 104, 36, 255), 4)
    draw.line((64, 30, 64, 98), fill=(120, 78, 24, 255), width=4)
    draw.line((40, 52, 88, 52), fill=(120, 78, 24, 255), width=4)
    draw.line((46, 82, 82, 42), fill=(120, 78, 24, 255), width=4)
    save(image, "tile-rune.png")


def decor_torch():
    image, draw = make_canvas()
    ellipse(draw, (20, 100, 108, 118), (22, 16, 10, 80))
    rounded(draw, (52, 44, 76, 106), 8, (108, 74, 39, 255), (69, 45, 22, 255), 3)
    polygon(draw, [(64, 12), (82, 44), (68, 60), (56, 46), (44, 58), (34, 40)], (255, 142, 50, 255), (173, 76, 21, 255), 3)
    polygon(draw, [(64, 22), (74, 42), (64, 52), (54, 42)], (255, 220, 96, 255))
    save(image, "tile-decor-torch.png")


def selected_card():
    image, draw = make_canvas()
    ellipse(draw, (24, 210, 488, 508), (24, 20, 18, 120))
    polygon(draw, [(124, 152), (256, 84), (386, 152), (424, 284), (320, 410), (188, 410), (88, 286)], (89, 55, 37, 255), (50, 30, 20, 255), 8)
    ellipse(draw, (174, 228, 338, 328), (173, 127, 82, 255), (100, 66, 38, 255), 8)
    for offset in range(0, 170, 24):
        draw.line((178 + offset, 228, 98 + offset, 328), fill=(136, 96, 62, 255), width=7)
    rounded(draw, (220, 86, 290, 258), 26, (116, 94, 50, 255), (56, 42, 22, 255), 7)
    ellipse(draw, (224, 46, 286, 108), (191, 163, 92, 255), (89, 69, 34, 255), 6)
    rounded(draw, (290, 150, 360, 242), 8, (101, 58, 31, 255), (48, 26, 14, 255), 6)
    rounded(draw, (306, 164, 344, 226), 4, (162, 112, 72, 255), (77, 52, 32, 255), 4)
    ellipse(draw, (322, 176, 334, 188), (243, 226, 196, 255))
    save(image, "selected-altar.png")


def main():
    hero()
    guard()
    bug()
    sentinel()
    slime()
    crystal()
    key()
    scroll()
    coin()
    plank()
    potion()
    exit_door()
    door_closed()
    door_open()
    bridge_broken()
    bridge_built()
    switch_off()
    switch_on()
    hazard()
    rune()
    decor_torch()
    selected_card()


if __name__ == "__main__":
    main()
