---
id: RCAD-V0-006
title: Primitive mesh generation
status: Done
priority: P0
depends_on:
  - RCAD-V0-003
  - RCAD-V0-004
specs:
  - specs/v0-api-spec.md
  - specs/v0-geometry-rendering-export-spec.md
---

# RCAD-V0-006 — Primitive mesh generation

## Goal

Generate triangle meshes for all v0 primitives using the shared geometry core.

## Scope

- 2D primitives:
  - Rectangle
  - Circle
  - Line
  - Triangle
  - Polygon
- 3D primitives:
  - Box
  - Pyramid
  - Cylinder
  - Sphere
  - Mesh passthrough
- 2D primitives extrude to solids with default `thickness=1`.

## Acceptance criteria

- [x] Every v0 primitive produces preview/export mesh data.
- [x] Geometry uses millimeters.
- [x] Generated meshes are closed where expected.
- [x] Segment defaults are reasonable for preview and export.
- [x] `Polygon` supports custom non-rectangular profiles.

## Validation

```bash
pnpm validate
```

## Notes

This ticket can initially ignore cutouts; that is handled separately.

