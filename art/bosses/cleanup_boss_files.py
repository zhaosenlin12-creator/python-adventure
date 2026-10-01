#!/usr/bin/env python3
"""Remove duplicate/descriptive boss files in public/assets/bosses that are
superseded by the shorter ``campaign_<N>.png`` name."""
from pathlib import Path

OUT = Path(r"C:\kaifa\game-google-clean\public\assets\bosses")
SUFFIXES = [
    'guardian', 'nian', 'water_dragon', 'mech_doctor', 'war_god', 'time_doctor',
    'mech_commander', 'flame_doctor', 'molecule', 'acid', 'magic_gate',
    'falling_gate', 'mirror_gate', 'beat_gate', 'workshop', 'final_gate',
]

removed = 0
for f in OUT.iterdir():
    if not f.is_file():
        continue
    name = f.name
    for suf in SUFFIXES:
        if name.endswith('_' + suf + '.png'):
            print(f"[DEL] {name}")
            f.unlink()
            removed += 1
            break

print(f"\nRemoved {removed} stale descriptive files.")
print("Remaining files:")
for f in sorted(OUT.iterdir()):
    print(' ', f.name)
