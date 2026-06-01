# Campaign Platform Visual Upgrade Design

Date: 2026-06-01
Status: Proposed and approved for spec writing
Scope: Frontend only

## Summary

This design upgrades the campaign mode platform-game frontend from placeholder procedural graphics and mixed utility UI into a cohesive adventure presentation inspired by the readability, charm, and layered scene composition of MapleStory-style 2D platform games.

The upgrade covers only frontend surfaces:

- Phaser platformer scene rendering
- campaign-mode platform HUD and overlays
- campaign selection and level entry UI for platform play
- local asset pipeline, loading, fallback, and verification

The backend, APIs, save schema, rewards logic, combat rules, and database behavior remain unchanged.

## Goals

1. Replace obviously placeholder scene visuals such as flat rectangles, generated circles, and temporary icon-like enemies with cohesive game art.
2. Make the platform campaign feel closer to a real side-scrolling adventure game, with cute readable characters, layered environments, and stronger stage identity.
3. Improve student appeal through brighter, friendlier, more memorable characters and environments without making the interface visually noisy.
4. Preserve current gameplay logic, level data, progression, and question/reward flows while upgrading presentation.
5. Establish a maintainable asset system so future campaign scenes stop depending on one-off `graphics.generateTexture()` logic.

## Non-Goals

- No backend changes.
- No API changes.
- No authentication, coin, XP, reward, or persistence changes.
- No rebalance of movement, combat, enemy stats, question logic, or campaign rules unless a tiny frontend-only visual adjustment is required to fit art.
- No attempt to copy MapleStory assets, characters, UI, or copyrighted layouts directly.

## Current State

The existing platform campaign frontend is structurally solid but visually inconsistent:

- [components/world/scenes/PlatformGameScene.ts](C:/kaifa/Obsidian/senlin-kaifa/game-google/components/world/scenes/PlatformGameScene.ts) procedurally draws most backgrounds, platforms, player art, enemies, items, and hazards.
- [components/game/PlatformGame.tsx](C:/kaifa/Obsidian/senlin-kaifa/game-google/components/game/PlatformGame.tsx) and [components/game/CampaignSelector.tsx](C:/kaifa/Obsidian/senlin-kaifa/game-google/components/game/CampaignSelector.tsx) provide the React shell, but the UI language is still closer to product UI than an adventure-game frontend.
- [lib/utils/assetPreloader.ts](C:/kaifa/Obsidian/senlin-kaifa/game-google/lib/utils/assetPreloader.ts) already gives the project a preload pattern that can be extended for real platform assets.
- [public/code-research/ASSET_NOTES.md](C:/kaifa/Obsidian/senlin-kaifa/game-google/public/code-research/ASSET_NOTES.md) and the generation scripts under [scripts](C:/kaifa/Obsidian/senlin-kaifa/game-google/scripts) prove the repo already has a workable pattern for licensed/open/local-generated assets, source tracking, and deterministic asset generation.

## Approaches Considered

### Option A: Full retro pixel conversion

Convert every platform-game surface, including React shell UI, into a strict retro pixel look.

Pros:

- Maximum visual cohesion
- Strongest resemblance to classic side-scrolling RPG-platform hybrids

Cons:

- Highest rewrite cost
- React shell becomes harder to keep clean on mobile and modern screens
- More risk of making the educational UI feel dated or cramped

### Option B: MapleStory-inspired scene upgrade with modern UI shell

Upgrade scene art, actors, platforms, items, and stage mood into a cute pixel-platform style, while reskinning the surrounding React UI into a game-like but modern, cleaner interface.

Pros:

- Best match for the current Phaser + React architecture
- Strong gameplay feel without forcing a fully retro shell
- More legible on mobile and easier to extend

Cons:

- Requires discipline to keep scene art and shell UI feeling related

### Option C: UI-first facelift with limited scene art changes

Refresh the menus and HUD first, but keep most runtime scene graphics procedural.

Pros:

- Fastest

Cons:

- Fails the core request
- The platform game still looks placeholder in motion

## Selected Direction

Option B is the selected design.

The visual target is:

- scene art and characters inspired by MapleStory-like charm, silhouette clarity, and layered backgrounds
- color readability and simple interaction clarity closer to Nintendo-style platform games
- a modern, cleaner surrounding HUD and selection UI that still feels like a game frontend instead of an admin dashboard

## Visual Direction

### Character Direction

- Main player character becomes a 2 to 2.5-head-tall chibi adventurer with large face readability, strong idle silhouette, and expressive jump/run poses.
- Enemy families become theme-based instead of function-based. For example:
  - valley creatures and patrol scouts
  - mirror sentries and reflection spirits
  - wind drummers and aerial hazards
  - academy workshop guardians and mechanical proctors
  - dam wardens and industrial sentinels
- Bosses should read as larger, more ceremonial, and more memorable versions of the local theme rather than tinted copies of small enemies.

### Environment Direction

- Platforms must stop reading as debug rectangles and instead read as traversable world pieces.
- Every stage theme gets layered background depth:
  - far background mood layer
  - midground landmarks
  - playable terrain tiles
  - foreground decoration and occasional framing
- Collectibles, goal markers, doors, hazards, and moving platforms need visually distinct silhouettes so readability improves with art rather than suffering from it.

### UI Direction

- HUD should remain compact during play.
- World and campaign UI should feel more like a light adventure game: illustrated badges, decorative panels, better hierarchy, stronger preview art, cleaner reward feedback.
- Mobile controls should be reskinned to feel like game controls instead of generic overlays.

## Scope Breakdown

### In Scope

- Player sprite presentation and animation states
- Standard enemy families and boss presentation
- Static and moving platforms
- Special platforms such as conveyor, bouncy, disappearing, and wind-related surfaces
- Background layers and ambient set dressing
- Collectibles, exit marker, and common hazard visuals
- Platform HUD, modal skinning, campaign entry cards, and mobile controls

### Out of Scope

- New story writing
- New campaign logic
- Backend content pipelines
- Audio redesign beyond minor frontend support if needed later

## Asset System Design

New platform-campaign art will live under:

- `public/assets/campaign-platform/characters/`
- `public/assets/campaign-platform/tiles/`
- `public/assets/campaign-platform/backgrounds/`
- `public/assets/campaign-platform/items/`
- `public/assets/campaign-platform/ui/`
- `public/assets/campaign-platform/meta/`

Rules:

- Asset naming must be theme-based and state-based, not tied to one-off code paths.
- All new art must have documented source or generation notes.
- Open or generated assets must follow the repo pattern already used for code-research assets.
- No opaque "mystery files" dropped into `public` without provenance.

## Frontend Architecture Changes

### 1. Scene Asset Resolution Layer

`PlatformGameScene` should stop owning raw drawing logic as the primary art system.

Instead, it should resolve art from a lightweight frontend asset map:

- campaign/theme id
- actor type
- platform type
- item type
- hazard type
- UI skin token

This layer chooses the correct texture, spritesheet, or fallback visual.

### 2. Procedural Fallback Layer

Current procedural drawing should not disappear immediately. It becomes fallback behavior:

- if a texture is missing, the scene still renders a safe placeholder
- gameplay remains testable during phased rollout
- theme migrations can happen incrementally without breaking every level at once

### 3. Platform Bundle Loading

[lib/utils/assetPreloader.ts](C:/kaifa/Obsidian/senlin-kaifa/game-google/lib/utils/assetPreloader.ts) will gain one or more platform-specific bundles so asset loading becomes explicit and predictable rather than hidden in scene code.

### 4. UI Token Layer

React campaign UI should define reusable visual tokens for:

- panel shell
- reward chip
- difficulty badge
- campaign theme badge
- HUD bars and icon frames
- modal shell
- mobile control shell

This keeps the platform frontend visually coherent even though part of it lives in React and part in Phaser.

## Theme Rollout Strategy

The upgrade should ship in phases, not as a single massive replacement.

### Phase 1: Global base style

Applies to every platform campaign:

- new player art
- global HUD refresh
- collectible refresh
- goal/flag refresh
- mobile controls refresh
- battle and result modal skin refresh where relevant

This alone makes the whole platform mode feel upgraded immediately.

### Phase 2: First vertical slice

First fully themed stage pack should target `campaign_12` in [lib/campaign-12-zhuimen.ts](C:/kaifa/Obsidian/senlin-kaifa/game-google/lib/campaign-12-zhuimen.ts).

Reason:

- bright valley / waterfall / descent-and-recovery theme is student-friendly
- it can show foreground depth, cliffs, falls, rope/bridge/platform variation, and cute enemy silhouettes early
- it gives the clearest before/after transformation from procedural art to real stage art

Deliverables for this slice:

- one complete player art set integrated into runtime
- one complete enemy family
- terrain tiles for ground, floating platforms, and special platforms
- layered valley/waterfall background pack
- updated items, hazards, and exit marker
- updated HUD skin

### Phase 3: Theme expansion to advanced door campaigns

Expand the art system to:

- `campaign_13` mirror corridor
- `campaign_14` wind rhythm plateau
- `campaign_15` academy workshop
- `campaign_16` dam finale

These campaigns already have strong environmental identities in the existing data and are ideal for theme-specific visual packs.

### Phase 4: Backfill earlier platform campaigns

Earlier campaigns in [lib/campaigns.ts](C:/kaifa/Obsidian/senlin-kaifa/game-google/lib/campaigns.ts) inherit:

- upgraded player and HUD
- upgraded generic items and goals
- generic terrain replacements
- light theme polish where needed

This avoids blocking the main upgrade on complete art replacement for every old stage before visible progress ships.

## Character and Platform Standards

### Player Standards

- Required states: idle, run, jump, fall, hurt, attack, victory
- Must remain readable at the actual in-game scale
- Hitbox stays gameplay-compatible even if rendered sprite becomes visually larger

### Enemy Standards

- Enemies need family silhouettes and clear threat reading
- Small enemies should use simple loop states
- Bosses may use fewer states at first but must have more distinctive silhouettes and attack-readability effects

### Platform Standards

- Ground tiles need top, fill, and edge treatment
- Floating platforms need at least one wooden or stone theme plus variants for special platform mechanics
- Conveyor, bouncy, disappearing, and moving platforms should remain instantly identifiable even after the art becomes more decorative

## UI Upgrade Design

### Campaign Selector and Entry Flow

[components/game/CampaignSelector.tsx](C:/kaifa/Obsidian/senlin-kaifa/game-google/components/game/CampaignSelector.tsx) should evolve from card-heavy product UI into a game-map-oriented selection surface with:

- stronger illustrated campaign icons
- clearer progression hierarchy
- richer stage previews
- better reward framing
- theme-linked color treatment

### Platform Shell

[components/game/PlatformGame.tsx](C:/kaifa/Obsidian/senlin-kaifa/game-google/components/game/PlatformGame.tsx) should become more game-like through:

- stronger top bar framing
- cleaner restart/return actions
- better integration between Phaser viewport and surrounding chrome
- more premium completion/failure presentation

### In-Game HUD

The HUD must be improved without blocking the playfield:

- better health bar frame
- clearer objective tracker
- more readable score/coin indicators
- cleaner skill/status indicators
- less flat default color treatment

## Performance and Fallback Requirements

- Scene performance must remain acceptable on desktop and touch devices already supported by the current project.
- Asset sizes should favor compact spritesheets and reusable tiles over giant per-level atlases when possible.
- Missing art must not break gameplay; the procedural fallback path remains until each asset category is fully migrated.
- Visual upgrades must not reduce interaction clarity for jump timing, enemy threat reading, or collectible recognition.

## Testing and Verification

The frontend upgrade is complete only when the following are verified:

1. Local run succeeds without backend changes.
2. The platform campaign still launches and plays through with current progression logic.
3. The player, platforms, enemies, collectibles, goal, and HUD no longer primarily render as placeholder geometry in upgraded paths.
4. Mobile controls remain usable.
5. The first vertical slice clearly reads as a cohesive themed adventure level.
6. No backend contract, reward flow, or saved progression behavior has changed.

Verification methods:

- local build
- local browser smoke test on campaign mode
- targeted visual inspection in the upgraded campaign slice
- regression smoke checks for restart, death, level complete, question modal, and campaign return flow

## Risks and Mitigations

### Risk: art inconsistency across packs

Mitigation:

- define one visual bible before producing too many assets
- limit early rollout to one vertical slice before scaling

### Risk: oversized assets or poor scaling in Phaser

Mitigation:

- define base display sizes early
- test at runtime scale before mass-producing art

### Risk: UI and scene feel disconnected

Mitigation:

- share color tokens, badge framing, icon style, and decorative language between React UI and Phaser HUD

### Risk: phased rollout leaves half-upgraded scenes feeling mixed

Mitigation:

- keep the first shipped phase focused on globally visible elements
- finish one complete vertical slice before spreading effort across many themes

## Acceptance Criteria

This design is satisfied when:

- the platform campaign frontend has a documented asset architecture
- the upgrade is explicitly frontend-only
- the selected visual direction is MapleStory-inspired rather than generic placeholder art
- the rollout plan prioritizes one complete sample theme before mass expansion
- the design preserves gameplay and backend behavior
- the design is implementable within the current Phaser + React structure without rewriting the full product
