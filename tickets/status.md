# v0 Ticket Status

Last updated: 2026-05-10

## Board

| ID | Status | Priority | Ticket | Depends on |
| --- | --- | --- | --- | --- |
| RCAD-V0-001 | Done | P0 | [Monorepo workspace skeleton](./RCAD-V0-001-monorepo-workspace.md) | — |
| RCAD-V0-002 | Done | P0 | [Public API types and package exports](./RCAD-V0-002-public-api-types.md) | 001 |
| RCAD-V0-003 | Done | P0 | [React evaluation and neutral CAD model](./RCAD-V0-003-react-evaluation-neutral-model.md) | 002 |
| RCAD-V0-004 | Done | P0 | [Parent-relative positioning and transforms](./RCAD-V0-004-positioning-transforms.md) | 003 |
| RCAD-V0-005 | Done | P0 | [Layout components](./RCAD-V0-005-layout-components.md) | 004 |
| RCAD-V0-006 | Done | P0 | [Primitive mesh generation](./RCAD-V0-006-primitive-mesh-generation.md) | 003, 004 |
| RCAD-V0-007 | Done | P0 | [Mesh validation](./RCAD-V0-007-mesh-validation.md) | 006 |
| RCAD-V0-008 | Done | P0 | [Cutouts and booleans](./RCAD-V0-008-cutouts-booleans.md) | 006, 007 |
| RCAD-V0-009 | Done | P0 | [STL export](./RCAD-V0-009-stl-export.md) | 006, 008 |
| RCAD-V0-010 | Done | P0 | [Browser viewer CLI](./RCAD-V0-010-browser-viewer-cli.md) | 001, 003, 006 |
| RCAD-V0-011 | Done | P1 | [Live reload and viewer UX](./RCAD-V0-011-live-reload-viewer-ux.md) | 010, 009 |
| RCAD-V0-012 | Done | P1 | [Canonical v0 demo and docs](./RCAD-V0-012-v0-demo-docs.md) | 005, 008, 009, 011 |

## Milestone definition of done

- [x] User can author a design as React components.
- [x] User can run `npx @jordyvd/react-cad-render design.tsx`.
- [x] Browser preview renders the full evaluated model, including cutouts.
- [x] STL export opens in FreeCAD at millimeter scale.
- [x] Canonical demo proves primitives, layout, custom components, cutouts, preview, and export.

## Current focus

RCAD-V0-001 through RCAD-V0-012 complete. Next focus: harden validation and polish any review findings that remain after the full v0 path is in place.

