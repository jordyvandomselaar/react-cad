---
id: RCAD-V0-001
title: Monorepo workspace skeleton
status: Done
priority: P0
depends_on: []
specs:
  - specs/v0-product-spec.md
  - specs/v0-api-spec.md
---

# RCAD-V0-001 — Monorepo workspace skeleton

## Goal

Create the monorepo structure that will hold all v0 packages.

## Scope

- Set up a JavaScript/TypeScript monorepo.
- Add package shells for:
  - `@jordyvd/react-cad`
  - `@jordyvd/react-cad-render`
  - shared geometry/runtime package or internal workspace if needed.
- Establish package naming, workspace boundaries, and build/test command placeholders.

## Acceptance criteria

- [x] Monorepo contains package directories for the component library and renderer.
- [x] Package names match the plan.
- [x] Package boundaries are documented in root README or package READMEs.
- [x] No CAD implementation required in this ticket.

## Validation

```bash
pnpm validate
```

The validation command starts the scaffold renderer server on an ephemeral port, fetches `/healthz`, `/model.json`, and `/`, then shuts down.

## Notes

Keep this boring. The goal is structure, not clever tooling.

