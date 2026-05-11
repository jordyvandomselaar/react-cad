---
id: RCAD-V0-009
title: STL export
status: Done
priority: P0
depends_on:
  - RCAD-V0-006
  - RCAD-V0-008
specs:
  - specs/v0-geometry-rendering-export-spec.md
  - specs/v0-product-spec.md
---

# RCAD-V0-009 — STL export

## Goal

Export the fully evaluated model to STL for FreeCAD and 3D-printing workflows.

## Scope

- Export full geometry after transforms, layout, and cutouts.
- Prefer binary STL by default.
- Preserve millimeter scale.
- Exclude operation helper geometry.
- Validate exportability before writing.

## Acceptance criteria

- [x] Exported STL opens in FreeCAD.
- [x] Exported STL includes cutout results.
- [x] Empty model export fails with a clear error.
- [x] Export uses the same shared geometry path as browser preview.

## Validation

```bash
pnpm validate
```

## Notes

STL does not preserve editable CAD semantics. That is fine for v0.

