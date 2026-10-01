#!/usr/bin/env python3
"""Sequentially generate all 16 campaign boss images."""
import os
import subprocess
import sys
from pathlib import Path

PROMPTS = Path(r"C:\kaifa\game-google-clean\art\bosses\prompts")
RAW = Path(r"C:\kaifa\game-google-clean\art\bosses\raw")
RAW.mkdir(parents=True, exist_ok=True)

CLI = Path(os.environ['USERPROFILE']) / '.codex' / 'skills' / 'gpt-image2-minimax' / 'scripts' / 'image_gen.py'

prompt_files = sorted(PROMPTS.glob('*.txt'))
print(f"Found {len(prompt_files)} prompts")

for prompt_path in prompt_files:
    out_path = RAW / (prompt_path.stem + '.png')
    if out_path.exists() and out_path.stat().st_size > 1000:
        print(f"[SKIP] {out_path.name} already exists ({out_path.stat().st_size} bytes)")
        continue
    print(f"\n=== Generating {prompt_path.stem} ===")
    proc = subprocess.run(
        [sys.executable, str(CLI), 'generate',
         '--prompt-file', str(prompt_path),
         '--out', str(out_path),
         '--aspect-ratio', '1:1',
         '--n', '1',
         '--no-watermark'],
        capture_output=True, text=True, timeout=180,
    )
    if proc.returncode == 0:
        print(f"[OK] {out_path.name}: {proc.stdout.strip()}")
    else:
        print(f"[FAIL] {out_path.name}: rc={proc.returncode}")
        print("STDOUT:", proc.stdout[:500])
        print("STDERR:", proc.stderr[:500])

print("\nAll done.")
