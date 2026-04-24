# Phase 1 Home Subject Universe Spec

Updated: 2026-04-13

## Goal

Upgrade the old `chapter -> map -> level` homepage into:

`subject -> chapter -> map -> level`

without breaking the existing Python campaign content.

## Scope

In scope:

- Add a real subject selection layer on the homepage.
- Keep all existing Python foundation chapters.
- Add new Python specialty chapters on top of the current Python track.
- Launch lighter starter chapters for C++, Java, Go, Vue, React, AI Programming, and AI Education.
- Keep the existing battle/map loop.
- Support two level runtimes:
  - `python`: real execution through Pyodide
  - `pattern`: structure validation plus simulated terminal output

Out of scope:

- Real C++ / Java / Go compilation in browser
- Rewriting the battle system
- Rewriting the world scene
- Backend schema changes

## User Flow

1. Homepage opens.
2. Player sees subject cards first.
3. Player enters one subject academy.
4. Player picks a chapter.
5. Player enters that chapter map.
6. Player clears 5 level nodes.

Open world integration:

- `open-campaign` now defaults into the Python subject path.
- If the event asks for a map directly, it opens Python + the requested chapter.

## Data Model

Primary metadata:

- `lib/learningHub.ts`
  - subjects
  - chapters
  - chapter counts
  - chapter lookup helpers

Runtime level data:

- `lib/levels.ts`
  - old foundation and advanced Python chapters
- `lib/learningExtraLevels.ts`
  - new Python specialty chapters
  - non-Python launch chapters

Merged export:

- `LEVELS = [...BASE_LEVELS, ...EXTRA_LEVELS]`

## Runtime Strategy

### Python levels

- Use the existing Pyodide executor.
- Keep expected output / keyword validation.
- Use real code execution.

### Non-Python levels

- Do not fake compilation.
- Validate required structural snippets.
- Reject unfinished answers containing `____`.
- Show short simulated output in the terminal.
- Reuse the same combat and reward loop so the experience stays coherent.

## UI Notes

- Homepage shows `SubjectSelect` first.
- Subject detail view shows `ChapterSelect`.
- Map header now uses chapter metadata, not only `Chapter N`.
- Editor language badge changes with the level:
  - Python
  - C++
  - Java
  - Go
  - JS / JSX
  - Prompt

## Launch Content

Python specialty chapters added:

- 17 Image Workshop
- 18 Audio Lab
- 19 Crypto Vault
- 20 AI Training Camp
- 21 3D Space
- 22 Game Dev Workshop

Other launch subjects:

- 101 C++ Kickoff
- 201 Java Object Town
- 301 Go Startup Port
- 401 Vue Component Canvas
- 501 React State Lab
- 601 Prompt Quest
- 602 Verify the Machine
- 701 Meet AI
- 702 Learn with AI

Each launch chapter currently has 5 playable nodes.

## Quality Gates

This phase is only green if all of these pass:

- Subject homepage renders.
- Subject -> chapter -> map -> level flow works.
- Python specialty level runs through Pyodide.
- Non-Python level validates with pattern mode and shows terminal output.
- Existing Python chapters still load from the same map system.
- Jest tests pass for metadata, extra levels, and pattern validation.
- Production build passes.

## Follow-up Work

- Add more chapter-localized Chinese copy where needed.
- Add richer chapter art and NPC intros.
- Add browser QA coverage for subject switching and one Python + one pattern level.
