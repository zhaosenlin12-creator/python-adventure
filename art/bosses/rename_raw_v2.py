#!/usr/bin/env python3
"""Rename raw boss images to match their public filename (drop theme suffix)."""
from pathlib import Path
import os

RAW = Path(r"C:\kaifa\game-google-clean\art\bosses\raw")

# Map: raw filename stem -> target stem (without .png)
RENAMES = {
    # Default theme
    "campaign_1_guardian": "campaign_1",
    "campaign_2_mech_doctor": "campaign_2",
    "campaign_3_water_dragon": "campaign_3",
    "campaign_4_war_god": "campaign_4",
    "campaign_5_time_doctor": "campaign_5",
    "campaign_6_mech_commander": "campaign_6",
    "campaign_7_flame_doctor": "campaign_7",
    "campaign_8_molecule": "campaign_8",
    "campaign_9_acid": "campaign_9",
    "campaign_10_nian": "campaign_10",
    "campaign_11_magic_gate": "campaign_11",
    "campaign_12_falling_gate": "campaign_12",
    "campaign_13_mirror_gate": "campaign_13",
    "campaign_14_beat_gate": "campaign_14",
    "campaign_15_workshop": "campaign_15",
    "campaign_16_final_gate": "campaign_16",
    # variant_b theme
    "campaign_7_variant_b_laser": "campaign_7_variant_b",
    "campaign_8_variant_b_quantum": "campaign_8_variant_b",
    "campaign_9_variant_b_toxic": "campaign_9_variant_b",
    # Specific named bosses
    "campaign_10_variant_b_ticket_master": "campaign_10_ticket_master",
    "campaign_10_variant_b_platform_master": "campaign_10_platform_master",
    "campaign_10_variant_b_conductor": "campaign_10_conductor",
}

for old_stem, new_stem in RENAMES.items():
    old = RAW / (old_stem + ".png")
    new = RAW / (new_stem + ".png")
    if not old.exists():
        print(f"[MISS] {old.name}")
        continue
    if new.exists() and new != old:
        # Remove conflicting target
        new.unlink()
    os.rename(old, new)
    print(f"[OK] {old_stem}.png -> {new_stem}.png")

print()
print("Remaining raw files:")
for f in sorted(RAW.glob("*.png")):
    print(' ', f.name)
