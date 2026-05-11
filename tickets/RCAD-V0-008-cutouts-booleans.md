---
id: RCAD-V0-008
title: Cutouts and booleans
status: Done
priority: P0
depends_on:
  - RCAD-V0-006
  - RCAD-V0-007
specs:
  - specs/v0-api-spec.md
  - specs/v0-geometry-rendering-export-spec.md
---

# RCAD-V0-008 — Cutouts and booleans

## Goal

Implement `<Cutout>` so users can create holes, slots, pass-throughs, and hollow spaces.

## Scope

- `<Cutout>` subtracts child geometry from the nearest solid ancestor.
- Support multiple cutouts on one parent.
- Cutouts affect both browser preview and STL export.
- Cutout geometry is not exported as positive geometry.

## Acceptance criteria

- [x] A cylinder cutout through a box produces a visible/exportable hole.
- [x] Repeated cutouts in a grid work.
- [x] Missing solid ancestor produces a clear error.
- [x] Non-intersecting cutout warns in the viewer/export validation.

## Validation

```bash
pnpm validate
```

## Notes

This is the riskiest v0 geometry ticket. Keep the API simple even if the internals are gnarly.

