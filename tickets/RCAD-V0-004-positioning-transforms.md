---
id: RCAD-V0-004
title: Parent-relative positioning and transforms
status: Done
priority: P0
depends_on:
  - RCAD-V0-003
specs:
  - specs/v0-api-spec.md
---

# RCAD-V0-004 — Parent-relative positioning and transforms

## Goal

Resolve v0 positioning and rotation into deterministic local transforms.

## Scope

- Implement numeric axis shortcuts.
- Implement named positions: `left`, `center`, `right`, `bottom`, `top`, `back`, `front`.
- Implement structured axis positions with `from`, `offset`, and optional `unit: "percent"`.
- Implement rotation in degrees.
- Compute child transforms from parent bounds.

## Acceptance criteria

- [x] Missing axes default to center.
- [x] `position={{ x: 20 }}` means 20mm right from parent center.
- [x] `position={{ x: { from: "right", offset: -20 } }}` means 20mm inward from the parent right face.
- [x] Percent offsets use parent size along the relevant axis.
- [x] Errors identify the invalid axis/value.

## Validation

```bash
pnpm validate
```

## Notes

No separate `anchor` prop in v0. `from` handles matching parent/child side or face alignment.

