---
id: RCAD-V0-011
title: Live reload and viewer UX
status: Done
priority: P1
depends_on:
  - RCAD-V0-010
  - RCAD-V0-009
specs:
  - specs/v0-viewer-spec.md
---

# RCAD-V0-011 — Live reload and viewer UX

## Goal

Make the browser viewer pleasant enough for the first printable loop.

## Scope

- Watch design files and reload on changes.
- Preserve camera when possible.
- Add orbit/rotate/pan/zoom controls.
- Add reset camera button.
- Add export STL button.
- Add error overlay and build status.

## Acceptance criteria

- Editing `design.tsx` updates the browser without command restart.
- Last valid model remains visible when a rebuild fails, when practical.
- Export button downloads or writes the current STL.
- Viewer shows cutout results, not uncut primitives.

## Notes

Terminal output should stay boring: URL, status, and errors.

