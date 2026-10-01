#!/usr/bin/env python3
"""Add 64x64 body lock to the simple boss creation path (single-boss case
where applyBossVisual is not used)."""
from pathlib import Path

plat = Path(r"C:\kaifa\game-google-clean\components\world\scenes\PlatformGameScene.ts")
text = plat.read_text(encoding="utf-8")

# Locate the single-boss creation path: 'enemy.setTexture(textureName);\n            enemy.setDisplaySize(size, size);'
# (it's the first one - indentation is 12 spaces)
needle = "            enemy.setTexture(textureName);\n            enemy.setDisplaySize(size, size);\n"
replacement = (
    "            enemy.setTexture(textureName);\n"
    "            enemy.setDisplaySize(size, size);\n"
    "            // 锁定 64x64 碰撞体（与原程序化贴图一致，防止 AI 立绘源图 1024x1024 拉大体量）。\n"
    "            if (enemy.body) {\n"
    "                const eBody = enemy.body as Phaser.Physics.Arcade.Body;\n"
    "                eBody.setSize(64, 64);\n"
    "                eBody.setOffset(0, 0);\n"
    "            }\n"
)
count = text.count(needle)
if count != 1:
    raise SystemExit(f"Expected exactly one occurrence of needle, found {count}")
text = text.replace(needle, replacement, 1)
plat.write_text(text, encoding="utf-8")
print("[OK] Single-boss body lock patched")
