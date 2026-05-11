# @jordyvd/react-cad

Component library for authoring CAD models with React-style components.

## v0 API

```tsx
import { Rectangle, Circle, Line, Triangle, Polygon, Text } from "@jordyvd/react-cad/2d";
import { Box, Pyramid, Cylinder, Sphere, Mesh } from "@jordyvd/react-cad/3d";
import { Horizontal, Vertical, Stack, Grid } from "@jordyvd/react-cad/layout";
import { Cutout } from "@jordyvd/react-cad/operations";
```

All dimensions are millimeters. Components return neutral CAD nodes that can be validated, compiled to meshes, previewed in the browser renderer, and exported as STL.

`Text` renders block glyphs through the same mesh path as the other 2D primitives:

```tsx
<Text value="Hello" size={10} thickness={1} />
```

Use `value` for the visible text. `size` defaults to `10`, `thickness` defaults to `1`, and v0 supports printable Basic Latin / US-ASCII characters (`U+0020` through `U+007E`). Space is treated as blank spacing; control characters such as tabs and newlines are rejected.

## Composition

Custom components are normal React functions. v0 evaluates designs as a static CAD snapshot, so design components must stay hook-free; use plain constants, props, helper functions, and normal component composition instead of `useMemo`, `useState`, or effects.

```tsx
function HolePattern() {
  return (
    <Grid columns={{ count: 2, gap: 40 }} rows={{ count: 2, gap: 20 }}>
      <Cutout><Cylinder radius={2.5} height={8} rotation={{ x: 90 }} /></Cutout>
      <Cutout><Cylinder radius={2.5} height={8} rotation={{ x: 90 }} /></Cutout>
      <Cutout><Cylinder radius={2.5} height={8} rotation={{ x: 90 }} /></Cutout>
      <Cutout><Cylinder radius={2.5} height={8} rotation={{ x: 90 }} /></Cutout>
    </Grid>
  );
}
```

## Positioning

Child positions are relative to parent bounds:

```tsx
<Box width={8} height={8} depth={8} position={{ x: { from: "right", offset: -12 } }} />
<Circle radius={3} position={{ x: { from: "left", offset: 25, unit: "percent" } }} />
```

Supported axis anchors:

- X: `left`, `center`, `right`
- Y: `bottom`, `center`, `top`
- Z: `back`, `center`, `front`

## Geometry/export notes

- 2D primitives are extruded by `thickness`.
- `Cutout` subtracts from the nearest solid ancestor.
- `Mesh` supports custom vertices/faces with optional validation modes.
- STL export writes binary STL using the model’s millimeter coordinates.
