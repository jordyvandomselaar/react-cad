# Project Plan

## Working agreement

- This file captures the product/API plan and gets updated as implementation decisions land.
- Ticket execution status lives in `./tickets/status.md`.
- Open questions stay visible until answered.

## Current status

- Project folder created: `./`
- Initial product direction captured.
- v0 implementation tickets `RCAD-V0-001` through `RCAD-V0-012` are complete in the local status board.
- The canonical demo now exercises custom components, 2D/3D primitives, `Horizontal`, `Vertical`, `Stack`, `Grid`, cutouts, browser preview, and STL export.

## Decisions

- Build a JavaScript/TypeScript package for authoring CAD designs with JSX.
- Use a multi-package architecture: separate packages for the component library and the web viewer.
- Use a monorepo for all packages.
- Component library package name: `@jordyvd/react-cad`.
- Local renderer/viewer package name: `@jordyvd/react-cad-render`.
- Use a React-style component model backed by a custom React renderer.
- Provide primitives for CAD design composition.
- Export basic geometric primitive components from the component library package.
- Include a locally runnable live-reload viewer with interactive 3D orbit/rotate controls.
- Use `react-three-fiber` as the browser/web viewer renderer inside the web viewer package.
- Include an exporter that writes real CAD output loadable by tools like FreeCAD.
- Optimize first for user experience and approachability, not CAD-professional completeness.
- Target users know React/components and CSS, but may know little or no CAD terminology.
- v0 export must support practical downstream use in FreeCAD and 3D-printing workflows.
- Support both primitive props and layout components.
- Support user-defined custom components as a core feature, using normal React composition.
- Depend on React itself for component composition; this is not a React-like clone with a custom JSX-only runtime.
- All units are millimeters (`mm`) by default. No pixels, points, rems, or screen units.
- v0 positioning is parent-relative only.
- v0 includes holes/cutouts/subtraction support.

## Product shape

### Packages

- All packages live in one monorepo.
- Component library package:
  - Published as `@jordyvd/react-cad`.
  - Exports CAD primitives, layout components, types, and React renderer integration needed to produce the neutral CAD model.
  - Owns the user-facing authoring API.
- Web viewer package:
  - Published/runnable as `@jordyvd/react-cad-render`.
  - Runs the browser-based local viewer.
  - Uses `react-three-fiber` to preview designs.
  - Consumes the neutral CAD model from the component library/runtime.
- Exporter package/module:
  - May start inside the component library or as its own package, but should stay architecturally separate from the web viewer.

### Package/API

- Users write CAD designs as JSX components.
- Components describe CAD primitives and compositions rather than DOM or Three.js objects directly.
- The package should feel familiar to React users.
- The component library should expose separate import paths for 2D and 3D primitives to prevent naming collisions:

```tsx
import { Rectangle, Circle, Line, Triangle, Polygon } from "@jordyvd/react-cad/2d";
import { Box, Pyramid, Cylinder, Sphere, Mesh } from "@jordyvd/react-cad/3d";
import { Grid, Horizontal, Vertical, Stack } from "@jordyvd/react-cad/layout";
import { Cutout } from "@jordyvd/react-cad/operations";
```

- The component library should export basic geometric primitives by default through those scoped paths:
  - 2D primitives from `@jordyvd/react-cad/2d`:
    - `<Rectangle>`
    - `<Circle>`
    - `<Line>`
    - `<Triangle>`
    - `<Polygon>`
  - 3D primitives from `@jordyvd/react-cad/3d`:
    - `<Box>`
    - `<Pyramid>`
    - `<Cylinder>`
    - `<Sphere>`
    - `<Mesh>` for custom 3D geometry
  - operations from `@jordyvd/react-cad/operations`:
    - `<Cutout>`

### Custom components

- Users should be able to build their own components with plain React functions. No special registration should be required:

```tsx
function ButtonPlate({ holes = 4 }) {
  return (
    <Rectangle width={80} height={40}>
      <Horizontal gap={10} align="center">
        {Array.from({ length: holes }).map((_, index) => (
          <Circle key={index} radius={3} />
        ))}
      </Horizontal>
    </Rectangle>
  );
}
```

### Primitive scope

- v0 includes both 2D and 3D primitives.
- 2D and 3D primitives have separate import paths so names can evolve independently without collisions.
- 2D primitives:
  - `<Rectangle>`
  - `<Circle>`
  - `<Line>`
  - `<Triangle>`
  - `<Polygon>`
- 3D primitives:
  - `<Box>`
  - `<Pyramid>`
  - `<Cylinder>`
  - `<Sphere>`
  - `<Mesh>`
- Custom 3D geometry is part of the v0 primitive list through `<Mesh>`.
- Open design detail: define how 2D primitives become exportable/printable when used in a 3D scene.
- 2D primitives become visible/exportable flat solids by default with a small documented default thickness.
- Users can override the generated thickness explicitly.

- The API should hide CAD jargon where possible and favor React/CSS-like concepts:
  - components
  - props
  - layout components
  - parent-relative positioning
  - named dimensions
  - reusable design tokens/constants
  - predictable composition
- TypeScript should guide users toward valid designs with friendly prop names and useful errors.
- Primitive props should include familiar dimensions and presentation fields, for example:
  - `width`
  - `height`
  - `depth`
  - `radius`
  - `color`
  - `position`
- Layout components should exist for common physical composition patterns, for example:
  - `<Horizontal>` for x-axis layout
  - `<Vertical>` for y-axis layout
  - `<Stack>` for z-axis layout only
  - `<Grid>` for repeated rows/columns of physical parts
  - future candidates: `<Center>`, `<Group>`, `<Align>`

### Units and positioning

- Millimeters are the only physical unit in v0.
- Numeric dimension props mean millimeters:
  - `width={20}` means `20mm`
  - `radius={5}` means `5mm`
- Numeric strings are not supported for measurements: use `20`, not `"20"`.
- Named placement strings are allowed where they represent sides/faces, for example `"center"`, `"left"`, `"right"`, `"top"`, `"front"`.
- Percent placement uses structured position objects with `unit: "percent"`, not string expressions like `"20%"`.
- No pixel-like units are supported.
- Positioning is always relative to the parent coordinate box in v0.
- Positioning should support ergonomic constraints such as:
  - centered in parent
  - `20%` from the right side of parent
  - `20mm` right from center
- Candidate API shape:

```tsx
<Box width={80} height={20} depth={40} color="tomato">
  <Cylinder
    radius={5}
    height={10}
    position={{ x: { from: "center", offset: 20 }, y: "center", z: "front" }}
  />
  <Sphere
    radius={4}
    position={{ x: { from: "right", offset: -20, unit: "percent" }, y: "center", z: "center" }}
  />
</Box>
```

- The exact syntax can still be refined, but the direction is structured objects over free-form strings.

### Position syntax workshop

Positioning needs to support beginner-friendly cases without turning into a full constraint solver.

Reference behavior from `react-three-fiber`:

- `react-three-fiber` positions objects with Three.js-style numeric vectors, typically `position={[x, y, z]}`.
- Positions are local to the parent object/group, so nesting naturally creates parent-relative transforms.
- It does not provide CSS-like side/face positioning, percentages, or expressions by default.
- For this project, the component library should accept higher-level position syntax and compile it into numeric transforms for the `react-three-fiber` viewer.

Current direction:

- `position` places a child relative to its parent coordinate box.
- Missing axes default to `"center"`.
- Numeric axis values are millimeter offsets from the parent center.
- Avoid free-form string expressions like `"right - 20%"`; they are cute but too parser-y and fragile.
- Prefer structured values that TypeScript can validate and autocomplete.
- Axis vocabulary follows the React/CSS mental model:
  - x-axis: `left`, `center`, `right`
  - y-axis: `bottom`, `center`, `top`
  - z-axis: `back`, `center`, `front`
- No separate `anchor` prop in v0.
- `from` decides both the parent reference and the child reference for edge/face placement:
  - `from: "center"` places the child center relative to the parent center.
  - `from: "right"` places the child right edge/face relative to the parent right edge/face.
  - `from: "top"` places the child top edge/face relative to the parent top edge/face.
  - Same pattern for `left`, `bottom`, `back`, and `front`.
- This keeps the common mental model simple: `from: "right"` starts from the right edge/face; a negative x offset moves inward from there.

Structured candidate API:

```tsx
type Unit = "mm" | "percent";

type XPosition =
  | number // mm from parent center; positive is right, negative is left
  | "left"
  | "center"
  | "right"
  | { from: "left" | "center" | "right"; offset?: number; unit?: Unit };

type YPosition =
  | number // mm from parent center; positive is top, negative is bottom
  | "bottom"
  | "center"
  | "top"
  | { from: "bottom" | "center" | "top"; offset?: number; unit?: Unit };

type ZPosition =
  | number // mm from parent center; positive is front, negative is back
  | "back"
  | "center"
  | "front"
  | { from: "back" | "center" | "front"; offset?: number; unit?: Unit };
```

Position object rules:

- Use numbers, not numeric strings: `20`, not `"20"`.
- `unit` defaults to `"mm"`.
- `offset` describes signed movement from `from` along that axis:
  - x-axis: positive is right, negative is left
  - y-axis: positive is top/up, negative is bottom/down
  - z-axis: positive is front, negative is back
- Edge/face placement uses the same `offset` field:
  - `from: "right", offset: -20` means 20mm inward from the right edge.
  - `from: "left", offset: 20` means 20mm inward from the left edge.
  - `from: "top", offset: -20` means 20mm inward from the top edge.
  - `from: "bottom", offset: 20` means 20mm inward from the bottom edge.
- `unit: "percent"` means percentage of the parent size along that axis.
- There is no `inset` field in v0; one offset concept is simpler.

Candidate simple examples:

```tsx
// Centered in parent.
<Sphere radius={5} position="center" />

// 20mm right from parent center.
<Sphere radius={5} position={{ x: 20 }} />

// Same idea, explicit/readable.
<Sphere radius={5} position={{ x: { from: "center", offset: 20 } }} />

// Child right edge is 20% inward from the parent's right side.
<Sphere radius={5} position={{ x: { from: "right", offset: -20, unit: "percent" } }} />
```

This syntax came from the idea `from: "center", left: "20", unit: "percent"`. The updated direction is:

- use `offset` for all relative movement
- use numeric values instead of numeric strings

```tsx
position={{ x: { from: "center", offset: -20, unit: "percent" } }}
position={{ x: { from: "right", offset: -20, unit: "percent" } }}
```

Goal: avoid expression strings while preserving “center”, “20% from right”, and “20mm right from center”.

If a future use case needs mismatched parent/child references, such as “place the child center 20mm from the parent right edge,” add a later explicit `origin`/`anchor` concept. Do not ship that complexity in v0.

### Layout components

- `<Horizontal>` lays children out along the x-axis.
- `<Vertical>` lays children out along the y-axis.
- `<Stack>` lays children out along the z-axis only.
- `<Grid>` lays children out in rows/columns on a plane, with explicit gaps in millimeters.
- These components should feel like simple physical flexbox primitives, but they are not CSS flexbox.
- Shared likely props:
  - `gap`: spacing between children in mm
  - `align`: alignment across the non-layout axes
  - `position`: parent-relative placement of the whole layout group
  - `Grid` uses object config props for rows and columns.
  - `columns` controls x-axis tracks.
  - `rows` controls y-axis tracks.
- Candidate API shape:

```tsx
<Horizontal gap={5} align="center">
  <Box width={20} height={10} depth={10} />
  <Cylinder radius={5} height={10} />
</Horizontal>

<Vertical gap={5} align="center">
  <Box width={20} height={10} depth={10} />
  <Sphere radius={5} />
</Vertical>

<Stack gap={2} align="center">
  <Box width={40} height={5} depth={40} />
  <Cylinder radius={12} height={20} />
</Stack>

<Grid
  columns={{ count: 3, gap: 5 }}
  rows={{ count: 2, gap: 5 }}
  align="center"
>
  <Circle radius={3} />
  <Circle radius={3} />
  <Circle radius={3} />
  <Circle radius={3} />
  <Circle radius={3} />
  <Circle radius={3} />
</Grid>
```

Candidate grid config shape:

```tsx
type GridAxisConfig = {
  count?: number;
  gap?: number;
  size?: number | "auto";
};
```

- `count`: number of columns/rows.
- `gap`: spacing between tracks in millimeters.
- `size`: optional fixed track size in millimeters, or `"auto"` from child bounds.
- If one axis omits `count`, it can be inferred from child count and the other axis.

### Cutouts and holes

- Cutouts are for subtracting geometry from another shape.
- This is needed for practical printable objects: screw holes, peg holes, slots, cable pass-throughs, hollow spaces, and repeated hole grids.
- v0 should include a beginner-friendly cutout API, not just raw boolean operations.
- Candidate API direction:

```tsx
<Box width={80} height={4} depth={40}>
  <Cutout>
    <Cylinder radius={3} height={10} />
  </Cutout>
</Box>
```

- The exact API can still be ticketed, but the behavior should be clear: child geometry inside `<Cutout>` removes material from the nearest solid parent or explicit target.

### Custom profiles and shaped edges

- Some common physical models need non-rectangular edges, for example two planks joined by triangular/mitered ends.
- The v0 model can support this in two ways:
  1. Compose the final silhouette from primitives, e.g. `<Rectangle>` + `<Triangle>` with matching thickness/depth.
  2. Start with a rectangular solid and use `<Cutout>` with a triangular prism/profile to remove material from an edge.
- v0 includes `<Polygon points={...}>` to make custom components and non-rectangular profiles practical.
- `<Polygon>` should be extrudable/exportable with the same default thickness behavior as other 2D primitives.

### Custom 3D geometry

- `<Mesh>` lets users build custom solids such as screw heads, unusual brackets, teeth, gears, or one-off adapter shapes.
- `<Mesh>` mental model:
  - A low-level closed triangle surface in millimeters.
  - `vertices` are 3D points: `[x, y, z]`.
  - `faces` reference vertex indexes and define outward-facing triangles.
  - The viewer converts it directly to a Three.js/R3F buffer geometry.
  - STL export writes the same triangles.
  - For printable/exportable solids, the mesh must be watertight/manifold.
- Candidate API:

```tsx
<Mesh
  vertices={[
    [0, 0, 0],
    [10, 0, 0],
    [0, 10, 0],
    [0, 0, 10],
  ]}
  faces={[
    [0, 1, 2],
    [0, 1, 3],
    [0, 2, 3],
    [1, 2, 3],
  ]}
/>
```

- Optional future ergonomics:

```tsx
<Mesh
  vertices={vertices}
  faces={faces}
  validate="solid"
  smooth={false}
/>
```

- Validation modes could be:
  - `validate="none"`: fastest, useful for preview experiments.
  - `validate="surface"`: faces are valid triangles with consistent winding.
  - `validate="solid"`: watertight/manifold enough for STL/export.

- This is powerful but easy to misuse: invalid faces, inverted normals, non-manifold geometry, and unprintable solids become possible.
- `<Mesh>` is official in v0, but should be documented as an advanced escape hatch.
- Prefer `<Polygon>` + extrusion/revolve/sweep-style helpers for approachable custom solids when they exist.
- v0 should include enough mesh validation to avoid silently exporting obviously broken solids.
- For custom screws specifically, a higher-level revolve/helix/thread API may be more ergonomic than hand-authored 3D faces.

### Local viewer

- Runs locally during development.
- Starts a local web UI in the browser.
- Uses `react-three-fiber` for the interactive 3D web rendering layer.
- Watches design files and live-reloads on changes.
- Renders a 3D visualization of the current design.
- Lets users rotate/orbit/pan/zoom the model interactively.
- Browser UI should be the primary development surface, not terminal output.
- Terminal output should mainly provide server status, errors, and export paths.
- Default local workflow:

```bash
npx @jordyvd/react-cad-render design.tsx
```

- `design.tsx` should default-export the design component.

### CAD export

- Converts the JSX-authored design into a real CAD interchange/output format.
- First target should be compatible with FreeCAD import.
- Export should represent actual geometry, not just a viewer-only mesh, whenever possible.
- For v0, prioritize a reliable export path that supports FreeCAD import and 3D printing over preserving every CAD semantic.
- STL is acceptable as a first export target if it gives the shortest path to “open in FreeCAD / slice / print”.
- STEP or FreeCAD-native document generation remains desirable for richer CAD editing later.
- v0 export target: STL first.
- Holes/cutouts/subtraction must be represented in the exported STL output.

## Early architectural assumptions

- Separate the system into three layers:
  1. **Authoring layer**: JSX components and TypeScript types from the component library package.
  2. **CAD scene/model layer**: renderer output as a neutral CAD object tree / operation graph.
  3. **Backends**: viewer backend and exporter backend consume the neutral model.
- The browser viewer backend lives in its own package and uses `react-three-fiber` to render the neutral CAD model into a live Three.js scene.
- Avoid coupling the JSX renderer directly to the visualization engine; otherwise export becomes a bolt-on mess.
- `react-three-fiber` is the viewer renderer, not the CAD source of truth.
- The viewer can use mesh/tessellated geometry, but the core model should preserve CAD semantics where practical.
- Preview/export geometry should avoid becoming two separate geometry engines. Shared geometry logic should feed both the viewer and STL export wherever possible.
- The browser viewer must be able to render the full evaluated model, including cutouts/booleans, not just raw uncut primitives.
- The shared geometry core should be browser-compatible, likely plain TypeScript or WebAssembly if needed later.
- Preview geometry tradeoffs:
  - Browser-side generation is simpler for live reload, fast for basic primitives/layout, and keeps the viewer self-contained, but can duplicate exporter logic and may struggle with heavier booleans.
  - Server-side generation keeps preview and export more consistent and can handle heavier geometry processing, but adds latency, complexity, and a more fragile dev-server pipeline.
  - Decision direction: shared geometry core that can run in the browser; use the same mesh generation path for viewer and STL export so cutouts render exactly as they export.
- The product should feel more like “React for physical objects” than “a CAD kernel with JSX syntax”.
- Friendly authoring ergonomics beat exhaustive modeling power for the first version.
- Custom components are a natural result of using React; the renderer should treat them as normal component composition that resolves into built-in CAD primitives/layout nodes.
- The layout system should be explicit and predictable, not a full CSS clone. Physical modeling has different constraints, and pretending otherwise would create weird behavior.

## UX principles

- Make the first successful model trivial to write, view, and export.
- `npx @jordyvd/react-cad-render design.tsx` should open a browser-based viewer and keep it in sync with source changes.
- Prefer readable JSX over mathematically clever APIs.
- Use familiar naming from React/CSS when it does not create misleading behavior.
- Every visible object should have clear parent-relative placement semantics.
- Provide good defaults: camera, lighting, units, materials/colors, file watching, export path.
- Surface mistakes as actionable errors in the local tool, not cryptic renderer crashes.
- Keep export as a first-class workflow, not an advanced hidden command.

## v0 product thesis

A React developer should be able to create a small printable object, preview it live, tweak it like a component tree, and export a FreeCAD-loadable file without learning traditional CAD first.

## v0 demo target

The canonical first demo should be a simple printable plate/card with repeated holes or raised shapes. It should prove:

- custom React components
- 2D primitives with default thickness
- 3D primitives
- `<Horizontal>`, `<Vertical>`, `<Stack>`, and `<Grid>` layout
- parent-relative positioning
- holes/cutouts/subtraction
- browser preview through `@jordyvd/react-cad-render`
- STL export that opens in FreeCAD and can feed a 3D-printing workflow

## Version roadmap

These are product phases, not necessarily exact npm semver releases.

### v0 — first printable loop

Goal: a React developer can author, preview, and export a simple printable object.

- `@jordyvd/react-cad` component library.
- `@jordyvd/react-cad-render` browser viewer launched with `npx @jordyvd/react-cad-render design.tsx`.
- React custom components work naturally.
- 2D primitives: `<Rectangle>`, `<Circle>`, `<Line>`, `<Triangle>`, `<Polygon>`.
- 3D primitives: `<Box>`, `<Pyramid>`, `<Cylinder>`, `<Sphere>`, `<Mesh>`.
- Layout: `<Horizontal>`, `<Vertical>`, `<Stack>`, `<Grid>`.
- Parent-relative positioning with `from`, `offset`, and optional `unit: "percent"`.
- Cutouts/holes via `<Cutout>`.
- Browser preview renders full evaluated model, including cutouts.
- STL export that opens in FreeCAD and supports 3D-printing workflows.
- Basic validation for dimensions, positioning, meshes, and exportability.

### v1 — useful maker toolkit

Goal: move from proof-of-loop to genuinely useful everyday modeling.

- Better modeling helpers: `Extrude`, `Revolve`, maybe `Sweep`.
- Quality-of-life geometry: fillet/chamfer if feasible, mirror, array/repeat helpers.
- Stronger cutout/boolean ergonomics and validation.
- Better diagnostics in the browser UI.
- Example library for common printable objects.
- More polished docs and starter templates.

### v2 — richer CAD interoperability

Goal: support workflows beyond mesh-only printing.

- STEP or FreeCAD-native export.
- Preserve more editable CAD semantics where possible.
- Sketch/profile workflows with constraints if they prove necessary.
- More robust boolean kernel strategy.
- Import/reference existing CAD or mesh assets if useful.

### v3 — ecosystem and advanced UX

Goal: make React CAD feel like a small ecosystem, not just a library.

- Reusable component marketplace/examples.
- Visual parameter controls in the viewer.
- Shareable previews or design packages.
- Higher-level domain components: screws, threads, gears, enclosures, brackets.
- Performance work for large/complex models.

## Ticketing notes

The plan is ready to turn into implementation tickets. Remaining details can be resolved inside the relevant tickets:

1. **Preview geometry generation**
   - Use one shared browser-compatible geometry core for both viewer and STL export.
   - Browser viewer must render the full evaluated model, including cutouts/booleans.
   - If geometry processing becomes heavy, move it to a browser Web Worker before making the server the only renderer.
2. **Positioning semantics**
   - Structured per-axis values, `offset`, and `unit: "percent"` are the v0 direction.
   - No separate `anchor` prop in v0; `from` handles edge/face alignment.
3. **Cutout API shape**
   - Use `<Cutout>` as a beginner-friendly wrapper around subtract behavior.
   - Cutouts subtract geometry from solids: holes, slots, pass-throughs, hollow spaces.
4. **Grid API details**
   - Use object config props, e.g. `columns={{ count: 3, gap: 5 }}` and `rows={{ count: 2, gap: 5 }}`.
   - Default grid plane should be x/y, with z left for stacking/depth.
   - Default fill should be row-major unless a ticket finds a better UX.

## Specs

v0 specs live in `./specs`:

- `specs/README.md`
- `specs/v0-product-spec.md`
- `specs/v0-api-spec.md`
- `specs/v0-geometry-rendering-export-spec.md`
- `specs/v0-viewer-spec.md`
- `specs/v0-ticket-breakdown.md`

## Tickets

v0 implementation tickets and status tracking live in `./tickets`:

- `tickets/README.md`
- `tickets/status.md`
- `tickets/RCAD-V0-001-monorepo-workspace.md`
- `tickets/RCAD-V0-002-public-api-types.md`
- `tickets/RCAD-V0-003-react-evaluation-neutral-model.md`
- `tickets/RCAD-V0-004-positioning-transforms.md`
- `tickets/RCAD-V0-005-layout-components.md`
- `tickets/RCAD-V0-006-primitive-mesh-generation.md`
- `tickets/RCAD-V0-007-mesh-validation.md`
- `tickets/RCAD-V0-008-cutouts-booleans.md`
- `tickets/RCAD-V0-009-stl-export.md`
- `tickets/RCAD-V0-010-browser-viewer-cli.md`
- `tickets/RCAD-V0-011-live-reload-viewer-ux.md`
- `tickets/RCAD-V0-012-v0-demo-docs.md`

## Draft milestones

1. Define product goal, target user, and v0 demo.
2. Choose the v0 export path optimized for FreeCAD + 3D printing.
3. Define the JSX API shape, primitive set, custom component expectations, layout components, and positioning syntax.
4. Define the package architecture and public import paths.
5. Choose the core geometry model that can support both preview and export.
6. Design the custom renderer and neutral CAD model boundary.
7. Design the `react-three-fiber` browser viewer/live-reload/export workflow.
8. Break down implementation phases.
9. Define validation plan before coding starts.
