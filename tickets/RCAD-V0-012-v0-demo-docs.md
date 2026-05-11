---
id: RCAD-V0-012
title: Canonical v0 demo and docs
status: Done
priority: P1
depends_on:
  - RCAD-V0-005
  - RCAD-V0-008
  - RCAD-V0-009
  - RCAD-V0-011
specs:
  - specs/v0-product-spec.md
  - specs/v0-api-spec.md
---

# RCAD-V0-012 — Canonical v0 demo and docs

## Goal

Create the demo and docs that prove v0 works end-to-end.

## Scope

- Build a simple printable plate/card with repeated holes or raised shapes.
- Use custom React components.
- Use 2D and 3D primitives.
- Use `Horizontal`, `Vertical`, `Stack`, and `Grid`.
- Use `Cutout`.
- Document first run, units, positioning, cutouts, mesh, preview, and STL export.

## Acceptance criteria

- Demo runs with `npx @jordyvd/react-cad-render design.tsx`.
- Demo exports STL that opens in FreeCAD.
- README explains the v0 happy path in under 10 minutes.
- Docs call out that all units are millimeters.

## Notes

This is the smell test. If this demo feels clunky, fix the API before pretending v0 is done.

