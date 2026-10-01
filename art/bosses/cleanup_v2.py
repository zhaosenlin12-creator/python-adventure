#!/usr/bin/env python3
"""Clean up duplicate boss files (keep only short-named canonical ones)."""
from pathlib import Path

OUT = Path(r"C:\kaifa\game-google-clean\public\assets\bosses")

# Descriptive suffixes we don't want
DESC_SUFFIXES = [
    'guardian', 'nian', 'water_dragon', 'mech_doctor', 'war_god', 'time_doctor',
    'mech_commander', 'flame_doctor', 'molecule', 'acid', 'magic_gate',
    'falling_gate', 'mirror_gate', 'beat_gate', 'workshop', 'final_gate',
    'variant_b_laser', 'variant_b_quantum', 'variant_b_toxic',
    'variant_b_ticket_master', 'variant_b_platform_master', 'variant_b_conductor',
    'nian_test', 'nian_test2',
]

removed = 0
for f in OUT.iterdir():
    if not f.is_file():
        continue
    name = f.name
    for suf in DESC_SUFFIXES:
        if name.endswith('_' + suf + '.png'):
            print(f"[DEL] {name}")
            f.unlink()
            removed += 1
            break

print(f"\nRemoved {removed} stale files.")
print("Final:")
for f in sorted(OUT.iterdir()):
    print(' ', f.name)
