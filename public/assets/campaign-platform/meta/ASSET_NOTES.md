# Campaign Platform Asset Notes

## Scope

- These assets are for the campaign platform frontend only.
- They do not require backend changes and must not alter backend contracts.

## Source Rules

- New assets in this folder must be original, locally generated, or from clearly documented open-license sources.
- If a third-party pack is used later, record the source, license, and any attribution requirements in this file before wiring it into code.
- Do not drop untracked or unexplained files into this folder.

## Frontend Usage

- Character, platform, item, background, and shell art in this folder should be resolved through `lib/platformArt.ts`.
- Phaser scene loading should treat these as presentation assets with gameplay-safe fallbacks.
