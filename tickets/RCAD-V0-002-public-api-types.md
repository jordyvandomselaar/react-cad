---
id: RCAD-V0-002
title: Public API types and package exports
status: Done
priority: P0
depends_on:
  - RCAD-V0-001
specs:
  - specs/v0-api-spec.md
---

# RCAD-V0-002 — Public API types and package exports

## Goal

Define the public TypeScript API for v0 before implementing geometry behavior.

## Scope

- Export scoped import paths:
  - `@jordyvd/react-cad/2d`
  - `@jordyvd/react-cad/3d`
  - `@jordyvd/react-cad/layout`
  - `@jordyvd/react-cad/operations`
- Define prop types for all v0 components.
- Include shared types for units, positioning, rotation, layout config, mesh data, and validation modes.

## Acceptance criteria

- [x] Example designs typecheck against the API.
- [x] Numeric measurements are numbers, not strings.
- [x] `Mesh`, `Polygon`, `Cutout`, and `Grid` are included in the official v0 API.
- [x] Types encode the v0 positioning model: `from`, `offset`, optional `unit`.

## Validation

```bash
pnpm typecheck
pnpm validate
```

## Notes

This ticket can use stub component implementations as long as the exported API shape is correct.

