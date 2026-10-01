#!/usr/bin/env python3
"""Patch PlatformGameScene.applyBossVisual to keep the 64x64 collision body
that the procedural boss textures used, so the AI portraits don't inflate
the hitbox to 1024x1024.
"""
from pathlib import Path

plat = Path(r"C:\kaifa\game-google-clean\components\world\scenes\PlatformGameScene.ts")
text = plat.read_text(encoding="utf-8")

old = (
    "        enemy.setTexture(textureName);\n"
    "        enemy.setDisplaySize(size, size);\n"
    "\n"
    "        if (bossConfig?.tint) {\n"
)
new = (
    "        enemy.setTexture(textureName);\n"
    "        enemy.setDisplaySize(size, size);\n"
    "\n"
    "        // 锁定碰撞体为 64x64（与原程序化贴图完全一致）。\n"
    "        // AI 立绘源图为 1024x1024，若不显式设置 body 尺寸，\n"
    "        // Arcade Physics 会按源图生成巨大碰撞体，导致命中/受击范围异常。\n"
    "        if (enemy.body) {\n"
    "            const body = enemy.body as Phaser.Physics.Arcade.Body;\n"
    "            body.setSize(64, 64);\n"
    "            body.setOffset(0, 0);\n"
    "        }\n"
    "\n"
    "        if (bossConfig?.tint) {\n"
)
if old not in text:
    raise SystemExit("applyBossVisual patch anchor not found")
text = text.replace(old, new, 1)
plat.write_text(text, encoding="utf-8")
print("[OK] applyBossVisual collision body locked to 64x64")
