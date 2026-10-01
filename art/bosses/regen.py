#!/usr/bin/env python3
"""Delete existing boss raw images and regenerate all 22 in the new cartoon style."""
import os
from pathlib import Path

RAW = Path(r"C:\kaifa\game-google-clean\art\bosses\raw")

# Remove all generated files except test files
removed = 0
for f in RAW.glob("*.png"):
    if f.name.endswith("_test.png") or f.name.endswith("_test2.png"):
        continue
    f.unlink()
    removed += 1
print(f"Removed {removed} raw files.")
print("Remaining:")
for f in sorted(RAW.glob("*.png")):
    print(' ', f.name)
