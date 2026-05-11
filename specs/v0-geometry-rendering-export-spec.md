# v0 Geometry, Rendering, and Export Spec

## Core architecture

The system has three layers:

1. **Authoring layer** — React components and TypeScript props from `@jordyvd/react-cad`.
2. **Neutral CAD model** — evaluated object tree with dimensions, transforms, layout, operations, and material metadata.
3. **Geometry backends** — shared geometry core produces renderable/exportable meshes for browser preview and STL export.

`react-three-fiber` is the viewer renderer, not the source of truth.

## Neutral model requirements

The neutral model must preserve:

- primitive type and props
- local bounds
- resolved transforms
- layout group boundaries
- color/material metadata for preview
- operation nodes like cutouts
- mesh vertices/faces for custom geometry

The neutral model should not contain Three.js objects.

## Shared geometry core

v0 uses one shared browser-compatible geometry core for both:

- browser preview
- STL export

The browser must render the full evaluated model, including cutouts/booleans.

If geometry processing becomes expensive, move it to a browser Web Worker before making the server the only renderer.

## Mesh generation

All primitives eventually produce triangle meshes for v0 preview/export.

- 2D primitives produce extruded meshes using `thickness`.
- 3D primitives produce closed triangle meshes.
- `<Mesh>` passes through user-supplied triangle data after validation.
- Cutouts produce boolean-subtracted meshes.

## Cutout behavior

`<Cutout>` subtracts child geometry from the nearest solid ancestor.

Rules:

- Cutout child transforms are resolved in the same coordinate system as other children.
- Multiple cutouts can apply to the same parent.
- Cutouts must affect both browser preview and STL export.
- If no solid ancestor exists, error with a clear message.
- If the cutout does not intersect the target solid, warn in the viewer.

## STL export

v0 export format: STL.

Requirements:

- Export full evaluated geometry after layout, transforms, and cutouts.
- Use millimeters as the intended unit scale.
- Prefer binary STL by default.
- Include all visible/exportable geometry.
- Exclude operation helper geometry.
- Output must open in FreeCAD.

## Validation

Minimum validation:

- Positive dimensions for primitives.
- No unsupported units.
- Valid position object shapes.
- Polygon has at least 3 points and is not obviously self-intersecting.
- Mesh faces reference valid vertices.
- Mesh faces are triangles.
- Export mesh is non-empty.
- Export warns/errors for clearly non-watertight geometry when `validate="solid"`.

Validation should produce actionable user-facing messages, not raw geometry engine errors.

