---
id: RCAD-V0-010
title: Browser viewer CLI
status: Done
priority: P0
depends_on:
  - RCAD-V0-001
  - RCAD-V0-003
  - RCAD-V0-006
specs:
  - specs/v0-viewer-spec.md
---

# RCAD-V0-010 — Browser viewer CLI

## Goal

Implement the local renderer command and basic browser viewer.

## Scope

- Provide executable package `@jordyvd/react-cad-render`.
- Support:

```bash
npx @jordyvd/react-cad-render design.tsx
```

- Load the default-exported design component.
- Start local web UI.
- Render model with `react-three-fiber`.

## Acceptance criteria

- Command starts without requiring project-specific glue code.
- Browser opens automatically or terminal prints a usable URL.
- Viewer renders the evaluated model.
- Invalid entrypoint produces clear terminal and browser errors.

## Notes

This ticket can ship a minimal viewer. Live reload and polish are separate.

