---
id: RCAD-V0-005
title: Layout components
status: Done
priority: P0
depends_on:
  - RCAD-V0-004
specs:
  - specs/v0-api-spec.md
---

# RCAD-V0-005 — Layout components

## Goal

Implement beginner-friendly physical layout primitives.

## Scope

- `<Horizontal>` lays children along x.
- `<Vertical>` lays children along y.
- `<Stack>` lays children along z.
- `<Grid>` lays children on the x/y plane using object config for `columns` and `rows`.
- Support `gap` in millimeters and `align` values.

## Acceptance criteria

- [x] Layout components compute child positions from child bounds.
- [x] Layout groups expose correct bounds to parent positioning.
- [x] `Grid` supports `columns={{ count, gap, size }}` and `rows={{ count, gap, size }}`.
- [x] Grid defaults to row-major fill.
- [x] Layout does not imply clipping, containment, or boolean operations.

## Validation

```bash
pnpm validate
```

## Notes

Keep it flexbox-ish, not CSS-compatible. Physical layout is not CSS; pretending otherwise is how APIs get haunted.

