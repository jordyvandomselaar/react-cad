---
id: RCAD-V0-003
title: React evaluation and neutral CAD model
status: Done
priority: P0
depends_on:
  - RCAD-V0-002
specs:
  - specs/v0-api-spec.md
  - specs/v0-geometry-rendering-export-spec.md
---

# RCAD-V0-003 — React evaluation and neutral CAD model

## Goal

Evaluate React component trees into a renderer-independent neutral CAD model.

## Scope

- Support normal React function components.
- Resolve custom components into built-in primitive/layout/operation nodes.
- Preserve primitive props, colors, children, operation nodes, and names.
- Keep Three.js/R3F objects out of the neutral model.

## Acceptance criteria

- [x] A default-exported React design component can be evaluated into a neutral model.
- [x] Custom user components require no registration.
- [x] Invalid child/component output produces actionable errors.
- [x] Neutral model can be serialized for viewer/debugging.

## Validation

```bash
node packages/react-cad-render/bin/react-cad-render.mjs examples/basic/design.tsx --validate-only
pnpm validate
```

## Notes

This is the real source-of-truth boundary. Do not leak viewer concerns into it.

