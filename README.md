# React CAD

React CAD lets React developers describe simple printable CAD models with JSX components, preview them in a local browser, and export binary STL for tools like FreeCAD and slicers.

All dimensions are millimeters. There are no pixels, rems, inches, or implicit CSS units in model geometry.

## Under-10-minute happy path

Create a design file:

```tsx
import { Circle, Rectangle } from "@jordyvd/react-cad/2d";
import { Box, Cylinder } from "@jordyvd/react-cad/3d";
import { Grid } from "@jordyvd/react-cad/layout";
import { Cutout } from "@jordyvd/react-cad/operations";

function MountingHoles() {
  return (
    <Grid columns={{ count: 2, gap: 40 }} rows={{ count: 2, gap: 20 }}>
      <Cutout><Cylinder radius={2.5} height={8} rotation={{ x: 90 }} /></Cutout>
      <Cutout><Cylinder radius={2.5} height={8} rotation={{ x: 90 }} /></Cutout>
      <Cutout><Cylinder radius={2.5} height={8} rotation={{ x: 90 }} /></Cutout>
      <Cutout><Cylinder radius={2.5} height={8} rotation={{ x: 90 }} /></Cutout>
    </Grid>
  );
}

export default function Design() {
  return (
    <Box width={60} height={36} depth={4} color="tomato">
      <MountingHoles />
      <Rectangle width={28} height={5} thickness={1} color="white" position={{ z: { from: "front", offset: 1 } }} />
      <Circle radius={3} thickness={1} color="gold" position={{ x: { from: "right", offset: -10 }, z: { from: "front", offset: 1 } }} />
    </Box>
  );
}
```

Run the viewer:

```bash
npx @jordyvd/react-cad-render design.tsx
```

The CLI opens the local viewer when possible and also prints URLs for headless and LAN access. The renderer binds to `0.0.0.0` by default, so another computer on the same network can open the printed `Network URL`; pass `--host=127.0.0.1` to restrict it to this machine. The browser viewer renders the evaluated model with React Three Fiber, supports orbit/rotate/pan/zoom, keeps the last valid model visible during rebuild errors, includes a preview-only **Wireframe** toggle, and includes an **Export STL** button.

For local monorepo development, run the canonical demo with workspace packages:

```bash
node packages/react-cad-render/bin/react-cad-render.mjs examples/basic/design.tsx
```

## Imports

The component library keeps 2D and 3D primitives on separate import paths to avoid naming collisions:

```tsx
import { Rectangle, Circle, Line, Triangle, Polygon, Text } from "@jordyvd/react-cad/2d";
import { Box, Pyramid, Cylinder, Sphere, Mesh } from "@jordyvd/react-cad/3d";
import { Horizontal, Vertical, Stack, Grid } from "@jordyvd/react-cad/layout";
import { Cutout } from "@jordyvd/react-cad/operations";
```

Custom React components work by default: return React CAD components from normal functions and compose them like any other JSX tree. v0 evaluates designs as a static CAD snapshot, so design components must stay hook-free; use plain constants, props, helper functions, and normal component composition instead of `useMemo`, `useState`, or effects.

`Text` renders through the same compiled mesh path as other primitives, so it appears in the viewer and exported geometry:

```tsx
<Text value="Hello" size={10} thickness={1} color="navy" />
```

Use `value` for the visible text. `size` defaults to `10`, `thickness` defaults to `1`, and v0 supports printable Basic Latin / US-ASCII characters (`U+0020` through `U+007E`). Space is treated as blank spacing; control characters such as tabs and newlines are rejected.

## Positioning and layout

Positions are relative to the parent’s local bounds. Numeric values are millimeters from center on that axis:

```tsx
<Box width={10} height={10} depth={10} position={{ x: 20 }} />
```

Use `from` and `offset` for parent-relative placement:

```tsx
// 10 mm left of the parent’s right edge
<Circle radius={3} position={{ x: { from: "right", offset: -10 } }} />

// 20% from the parent’s left edge
<Box width={8} height={8} depth={8} position={{ x: { from: "left", offset: 20, unit: "percent" } }} />
```

Axis references are `left/center/right`, `bottom/center/top`, and `back/center/front`.

Layout components place children in parent-local space:

- `Horizontal` lays out along X.
- `Vertical` lays out along Y.
- `Stack` lays out along Z.
- `Grid` lays out rows and columns with `{ count, gap, size }` config objects.

## Cutouts, mesh, and export

`<Cutout>` subtracts its child geometry from the nearest parent solid. The viewer and `/model.stl` both use the same cutout-aware compiled model, so the browser preview matches the exported STL.

`Mesh` is available for advanced custom geometry. v0 validates finite vertices, face indices, and optional `validate="surface" | "solid"` constraints before preview/export.

Binary STL export writes the model’s millimeter coordinates directly. To sanity-check scale in FreeCAD, import the STL and measure the canonical cassette demo: its shell is `96 × 60 × 4` mm, with raised label/reel details on the front face.

## Validation

After dependencies are installed locally, run:

```bash
pnpm validate
```

That builds the package artifacts, verifies consumer-style package imports, typechecks the monorepo, runs the core geometry/export tests, starts the renderer on an ephemeral port, fetches the viewer shell, evaluates the canonical demo, and verifies non-empty STL output.
