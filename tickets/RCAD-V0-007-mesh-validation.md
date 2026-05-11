---
id: RCAD-V0-007
title: Mesh validation
status: Done
priority: P0
depends_on:
  - RCAD-V0-006
specs:
  - specs/v0-api-spec.md
  - specs/v0-geometry-rendering-export-spec.md
---

# RCAD-V0-007 — Mesh validation

## Goal

Prevent obviously broken custom meshes and exports.

## Scope

- Validate `<Mesh>` vertices and faces.
- Validate polygon point counts and obvious self-intersections.
- Validate positive dimensions for primitives.
- Support validation modes:
  - `none`
  - `surface`
  - `solid`

## Acceptance criteria

- [x] Mesh faces must reference existing vertices.
- [x] Mesh faces must be triangles.
- [x] `solid` validation warns/errors for obviously non-watertight meshes.
- [x] Errors are actionable and include node name/path when available.

## Validation

```bash
pnpm test
pnpm validate
```

## Notes

Validation does not need to be perfect in v0. It does need to prevent silent garbage exports.

