#!/usr/bin/env python3
"""Rename the raw files to the cutout-friendly names."""
from pathlib import Path
import os

RAW = Path(r"C:\kaifa\game-google-clean\art\bosses\raw")

RENAMES = {
    "campaign_7_variant_b_laser.png": "campaign_7_variant_b.png",
    "campaign_8_variant_b_quantum.png": "campaign_8_variant_b.png",
    "campaign_9_variant_b_toxic.png": "campaign_9_variant_b.png",
    "campaign_10_variant_b_ticket_master.png": "campaign_10_ticket_master.png",
    "campaign_10_variant_b_platform_master.png": "campaign_10_platform_master.png",
    "campaign_10_variant_b_conductor.png": "campaign_10_conductor.png",
}

for old_name, new_name in RENAMES.items():
    old_path = RAW / old_name
    new_path = RAW / new_name
    if old_path.exists() and not new_path.exists():
        os.rename(old_path, new_path)
        print(f"[OK] {old_name} -> {new_name}")
    elif new_path.exists():
        print(f"[SKIP] {new_name} already exists")
    else:
        print(f"[MISS] {old_name} not found")
