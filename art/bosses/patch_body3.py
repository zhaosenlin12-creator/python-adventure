#!/usr/bin/env python3
"""Patch boss2 spawn path with 64x64 body lock."""
from pathlib import Path

plat = Path(r"C:\kaifa\game-google-clean\components\world\scenes\PlatformGameScene.ts")
text = plat.read_text(encoding="utf-8")

needle = (
    "        boss2.setDisplaySize(this.secondBossConfig.size || 80, this.secondBossConfig.size || 80);\n"
    "        (boss2 as any).damage = 3;\n"
)
replacement = (
    "        boss2.setDisplaySize(this.secondBossConfig.size || 80, this.secondBossConfig.size || 80);\n"
    "        // 锁定 64x64 碰撞体（与原程序化贴图一致）\n"
    "        if (boss2.body) {\n"
    "            const b2Body = boss2.body as Phaser.Physics.Arcade.Body;\n"
    "            b2Body.setSize(64, 64);\n"
    "            b2Body.setOffset(0, 0);\n"
    "        }\n"
    "        (boss2 as any).damage = 3;\n"
)
count = text.count(needle)
if count != 1:
    raise SystemExit(f"Expected exactly one occurrence of needle, found {count}")
text = text.replace(needle, replacement, 1)
plat.write_text(text, encoding="utf-8")
print("[OK] boss2 body lock patched")
