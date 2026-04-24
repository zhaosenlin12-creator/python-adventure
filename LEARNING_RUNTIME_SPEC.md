# Learning Runtime Spec

Updated: 2026-04-13

## Why two runtimes

The current project has one real in-browser runtime today:

- Python via Pyodide

The project does **not** have real browser runtimes for:

- C++
- Java
- Go
- Vue SFC compilation
- React bundling

For that reason, the launch architecture uses two explicit runtime modes instead of pretending all subjects run the same way.

## Runtime modes

### 1. `python`

Used for:

- existing Python chapters
- new Python specialty chapters

Behavior:

- load Pyodide only when needed
- execute learner code
- capture stdout
- validate by `expectedOutput` and/or `validationKeyword`

### 2. `pattern`

Used for:

- C++
- Java
- Go
- Vue
- React
- AI Programming
- AI Education

Behavior:

- do not load Pyodide
- validate code or prompt structure by required snippets
- fail if the learner leaves `____` placeholders unfinished
- show short simulated terminal output

## Validation contract

Pattern levels use:

- `requiredSnippets`
- `simulatedOutput`

Validation rules:

1. Normalize whitespace and casing.
2. Check all required snippets.
3. Reject unfinished placeholders.
4. Return short feedback and simulated output.

## Design principle

This system is intentionally honest:

- Python chapters are real execution.
- Other launch subjects are real interaction, but structure-validated.

That keeps the product playable now without claiming technical capabilities the current browser runtime does not have.

## Performance principle

Only Python levels should trigger Pyodide loading.

Reason:

- Pyodide is heavy.
- Loading it for prompt-only or pattern-only chapters adds wasted startup cost.
- Subject switching should stay responsive.

## Future upgrade path

Possible later expansions:

- remote execution sandbox for compiled languages
- AST-based structural checks
- richer per-language editor UX
- guided hints per missing snippet
- subject-specific terminal skins
