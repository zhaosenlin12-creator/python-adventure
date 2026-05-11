# Code Research Asset Notes

## Generated Reference Board

- File: `public/code-research/generated-reference-board.png`
- Source: OpenAI image generation, created locally during Code Research implementation.
- Purpose: Original visual reference and atmospheric background for the Code Research map and UI.
- License boundary: This is not a copied CodeCombat screenshot, logo, character, level, or proprietary asset. It is an original fantasy coding-game reference board created from a prompt that explicitly avoids trademarked marks and copied layouts.

## Generated Sprite Pack

- Folder: `public/code-research/sprites/`
- Source: locally generated original PNG assets via `scripts/generate_code_research_assets.py`
- Purpose: replace placeholder text and emoji tokens with reusable in-game sprites for:
  - hero
  - guard / bug / sentinel / slime enemies
  - crystal / key / scroll / coin / plank / potion items
  - exit / closed door / opened door / broken bridge / built bridge / switch / hazard / rune / torch decor
  - selected challenge card illustration
- License boundary: these are original local assets made for this project and are not copied from CodeCombat proprietary atlases, spritesheets, or level art.

## Local Sprite Rules

- Keep these assets original or locally generated.
- Do not import proprietary CodeCombat spritesheets, atlases, unit icons, or level thumbnails.
- If higher-fidelity generated or licensed replacements are added later, record their source and prompt/license here before wiring them into the UI.

## Kenney Tiny Dungeon Assets

- Folder: `public/code-research/tiny-dungeon/`
- Source: Kenney `Tiny Dungeon`
- License: `CC0 1.0`
- Local source archive:
  - `.tmp-assets/kenney/tiny-dungeon/kenney_tiny-dungeon.zip`
- Purpose:
  - dungeon floor and wall tiles for the guided opening stage
  - hero and skeleton-like enemy replacement for more game-like scene rendering
  - door arch / exit arch / torch wall props for the opening dungeon atmosphere

## Kenney RPG Audio

- Folder: `public/code-research/audio/`
- Source: Kenney `RPG Audio`
- License: `CC0 1.0`
- Local source archive:
  - `.tmp-assets/kenney/rpg-audio.zip`
- Purpose:
  - real footstep, collect, door-open, switch, and creak SFX for Code Research level feedback

## Kenney Pico-8 City Assets

- Folder: `public/code-research/pico-city/`
- Source: Kenney `Pico-8 City`
- License: `CC0 1.0`
- Local source folder:
  - `kenney_pico-8-city/`
- Generation script:
  - `scripts/generate_pico_city_assets.py`
- Purpose:
  - extract cropped city-street and quay backgrounds for the first guided Code Research levels
  - extract matching pixel characters and props so the stage reads as one coherent scene instead of a plain grid board

## Scribble Dungeon Stage Assets

- Folder: `public/code-research/scribble-dungeon/`
- Sources:
  - Kenney `Scribble Dungeons`
  - OpenGameArt `Top Down Dungeon Pack`
- Local source folders:
  - `.tmp-assets/kenney/scribble-dungeons/unzipped/`
  - `.tmp-assets/oga/top-down-dungeon-pack/unzipped/`
- Generation script:
  - `scripts/generate_scribble_dungeon_assets.py`
- Purpose:
  - compose larger first-level dungeon stage backgrounds with clearer pathing and stronger scene readability
  - export matching hero / guard / door / stairs / trap / prop sprites for the guided opening levels
- License boundary:
  - scene PNGs are original local compositions generated inside this repo from open assets
  - do not replace these with proprietary CodeCombat battlemaps, spritesheets, thumbnails, or extracted level art without checking license terms first

## Calciumtrice Dungeon Stage Assets

- Folder: `public/code-research/calciumtrice-dungeon/`
- Sources:
  - OpenGameArt `Dungeon Tileset` by `Calciumtrice`
  - `warrior-spritesheet-calciumtrice.png`
  - `skeleton-spritesheet-calciumtrice.png`
- License: `CC BY 3.0`
- Local source folders:
  - `.tmp-assets/calciumtrice/tileset/`
  - `.tmp-assets/calciumtrice/warrior/`
  - `.tmp-assets/calciumtrice/skeleton/`
- Generation script:
  - `scripts/generate_scribble_dungeon_assets.py`
- Purpose:
  - replace the earlier mixed dungeon mockups with a single, more coherent pixel-dungeon art direction for the full Code Research campaign
  - export matching scene backgrounds plus hero / enemy / exit / door / item / trap sprites used by `dungeonScene`
  - keep interactive tokens on transparent backgrounds so board elements blend with each scene instead of showing mismatched icon blocks
- Scene coverage:
  - `scene-training-hall-v2.png`
  - `scene-guard-corridor-v2.png`
  - `scene-loop-gallery-v2.png`
  - `scene-bronze-gate-v2.png`
  - `scene-river-crossing-v1.png`
  - `scene-switch-sanctum-v1.png`
  - `scene-scan-ruins-v1.png`
  - `scene-terminal-temple-v1.png`
- Unified transparent token set (latest):
  - heroes/enemies: `hero-guide-v3.png`, `guard-red-v3.png`, `sentinel-blue-v2.png`, `bug-purple-v2.png`
  - progression props: `barrel-key-v3.png`, `crate-scroll-v3.png`, `switch-off-v2.png`, `switch-on-v2.png`
  - traversal/combat props: `plank-bundle-v2.png`, `bridge-broken-v2.png`, `bridge-built-v2.png`, `trap-hazard-v2.png`
  - bonus props: `coin-cache-v1.png`, `potion-v1.png`
- Attribution:
  - credit `Calciumtrice` when redistributing these generated derivatives because the base tileset is `CC BY 3.0`
- License boundary:
  - stage PNGs and token sprites in this folder are local derivative compositions built from the licensed source pack plus original pixel icons drawn inside the generation script
  - do not replace these with proprietary CodeCombat battlemaps, unit spritesheets, or extracted level art

## Local Synth Audio

- Source: generated at runtime with browser `WebAudio` oscillators in `components/code-research/CodeResearchPage.tsx`
- Purpose:
  - lightweight ambient dungeon drone when sound is enabled
  - local command feedback for move / collect / attack / open / build / switch / fail / success / scan
- License boundary: no proprietary music or ripped game audio is bundled. Current audio is original synthesized feedback produced locally in code.

## Prompt

```text
Use case: stylized-concept
Asset type: reference board for a browser educational coding game UI, to guide local game assets
Primary request: Create an original fantasy programming challenge game reference board inspired by broad browser coding adventure games, not copying any specific game. Show floating dungeon islands on a teal map, a central challenge card, side menu icons, resource gems/stars, a small orange hero token, a skeleton-like training dummy, key, scroll, crystal, and stone floor tiles.
Style/medium: polished 2D game concept art, hand-painted browser game UI, chunky shapes, readable silhouettes
Composition/framing: one 16:9 board with separated UI asset callouts and a map scene, no exact screenshots, no real product logos
Lighting/mood: adventurous, bright teal mist, golden highlights, classroom-friendly
Color palette: teal map water, warm tan stone, emerald start button, yellow stars, cyan crystals, rust dungeon rocks
Text: no readable text except small generic labels like HERO, KEY, GEM if needed
Constraints: original design only; no CodeCombat logo, no CodeCombat characters, no trademarked marks, no copied level layout; no watermark
```

## Ongoing Rules

- Do not add CodeCombat trademarks, logos, proprietary level scripts, unit configs, paid content, or account-gated resources.
- If additional raster assets are generated, place them in this folder and add prompt/source notes here.
- If any third-party open-source asset is used, record its license and attribution here before referencing it in code.
