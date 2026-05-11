# v0 Ticket Breakdown

These tickets are implementation-sized slices. Exact issue tracker format can come later.

## 1. Workspace/package skeleton

Create the monorepo package structure for:

- `@jordyvd/react-cad`
- `@jordyvd/react-cad-render`
- shared geometry/runtime module if needed

Acceptance:

- Packages expose planned import paths.
- No implementation beyond scaffolding/types required for this ticket.

## 2. Public API types and component declarations

Define TypeScript props and component exports for:

- `@jordyvd/react-cad/2d`
- `@jordyvd/react-cad/3d`
- `@jordyvd/react-cad/layout`
- `@jordyvd/react-cad/operations`

Acceptance:

- Example design files typecheck.
- Numeric-string measurements are rejected by types where possible.

## 3. React evaluation and neutral model

Implement React component evaluation into a neutral CAD model.

Acceptance:

- Custom components resolve into primitive/layout/operation nodes.
- Neutral model contains no Three.js objects.
- Invalid child types produce clear errors.

## 4. Positioning and transforms

Implement parent-relative positioning:

- `from`
- `offset`
- `unit: "mm" | "percent"`
- numeric shortcuts
- named side/face strings
- rotation in degrees

Acceptance:

- Position examples from `v0-api-spec.md` resolve correctly.
- Missing axes default to center.

## 5. Layout components

Implement:

- `<Horizontal>`
- `<Vertical>`
- `<Stack>`
- `<Grid>`

Acceptance:

- Layout groups compute bounds from children.
- `gap` is in millimeters.
- `Grid` supports `columns`/`rows` object config.

## 6. Primitive mesh generation

Implement mesh generation for:

- 2D: Rectangle, Circle, Line, Triangle, Polygon
- 3D: Box, Pyramid, Cylinder, Sphere, Mesh

Acceptance:

- All primitives preview and export.
- 2D primitives have default `thickness=1`.
- Mesh validates vertex/face references.

## 7. Cutouts/booleans

Implement `<Cutout>` subtraction.

Acceptance:

- Cutouts affect preview and STL export.
- Multiple cutouts work on one parent.
- Missing target produces clear error.

## 8. STL export

Implement STL export from evaluated geometry.

Acceptance:

- Exports full model after layout/transforms/cutouts.
- STL opens in FreeCAD.
- Export validates non-empty geometry.

## 9. Browser viewer

Implement `@jordyvd/react-cad-render` browser UI.

Acceptance:

- `npx @jordyvd/react-cad-render design.tsx` starts viewer.
- Viewer uses `react-three-fiber`.
- Live reload works.
- Export STL button works.

## 10. Demo and docs

Create canonical v0 demo and minimal docs.

Acceptance:

- Demo includes custom components, grid, cutouts, 2D/3D primitives, and export.
- README explains first run, imports, units, positioning, cutouts, and export.

