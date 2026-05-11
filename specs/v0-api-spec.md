# v0 API Spec

## Packages and import paths

All packages live in a single monorepo.

Component library package:

```tsx
@jordyvd/react-cad
```

Scoped imports:

```tsx
import { Rectangle, Circle, Line, Triangle, Polygon } from "@jordyvd/react-cad/2d";
import { Box, Pyramid, Cylinder, Sphere, Mesh } from "@jordyvd/react-cad/3d";
import { Horizontal, Vertical, Stack, Grid } from "@jordyvd/react-cad/layout";
import { Cutout } from "@jordyvd/react-cad/operations";
```

Viewer package:

```bash
npx @jordyvd/react-cad-render design.tsx
```

## Design entrypoint

`design.tsx` should default-export a React component:

```tsx
export default function Design() {
  return <Box width={40} height={10} depth={20} />;
}
```

The renderer evaluates normal React composition. User-defined components require no registration.

## Units

- All dimensions are millimeters.
- Numeric props are interpreted as millimeters.
- Numeric strings are not supported: use `20`, not `"20"`.
- Position offsets may use `unit: "percent"` to mean percentage of the parent size along that axis.
- No px/rem/em/pt/screen units in v0.

## Coordinate system

- `x`: left/right, positive right.
- `y`: bottom/top, positive top/up.
- `z`: back/front, positive front.
- Primitive local bounds are centered on their local origin unless a primitive explicitly documents otherwise.
- Child positioning is parent-relative.

## Common props

All visible primitives and layout groups support:

```ts
type CommonProps = {
  position?: Position;
  rotation?: Rotation;
  color?: string;
  name?: string;
  children?: React.ReactNode;
};

type Rotation = number | { x?: number; y?: number; z?: number };
```

Rotation values are degrees. A numeric `rotation` rotates around `z` for 2D convenience.

`scale` is not a v0 prop; users should model physical dimensions directly.

## Position

```ts
type Unit = "mm" | "percent";

type Position =
  | "center"
  | {
      x?: XPosition;
      y?: YPosition;
      z?: ZPosition;
    };

type XPosition =
  | number
  | "left"
  | "center"
  | "right"
  | { from: "left" | "center" | "right"; offset?: number; unit?: Unit };

type YPosition =
  | number
  | "bottom"
  | "center"
  | "top"
  | { from: "bottom" | "center" | "top"; offset?: number; unit?: Unit };

type ZPosition =
  | number
  | "back"
  | "center"
  | "front"
  | { from: "back" | "center" | "front"; offset?: number; unit?: Unit };
```

Rules:

- Missing axes default to `"center"`.
- Numeric axis values are millimeter offsets from parent center.
- `offset` defaults to `0`.
- `unit` defaults to `"mm"`.
- `from` uses matching parent/child references:
  - `from: "center"` aligns child center to parent center, plus offset.
  - `from: "right"` aligns child right face to parent right face, plus offset.
  - `from: "top"` aligns child top face to parent top face, plus offset.

Examples:

```tsx
<Sphere radius={5} position="center" />
<Sphere radius={5} position={{ x: 20 }} />
<Sphere radius={5} position={{ x: { from: "center", offset: 20 } }} />
<Sphere radius={5} position={{ x: { from: "right", offset: -20 } }} />
<Sphere radius={5} position={{ x: { from: "right", offset: -20, unit: "percent" } }} />
```

## 2D primitives

2D primitives are flat solids by default, not invisible sketches.

Shared behavior:

- Lie in the local `x/y` plane.
- Extrude along local `z`.
- `thickness` defaults to `1` mm.
- Can be previewed and exported without extra extrusion props.

### `<Rectangle>`

```ts
type RectangleProps = CommonProps & {
  width: number;
  height: number;
  thickness?: number;
};
```

### `<Circle>`

```ts
type CircleProps = CommonProps & {
  radius: number;
  thickness?: number;
  segments?: number;
};
```

### `<Line>`

```ts
type LineProps = CommonProps & {
  from: [number, number];
  to: [number, number];
  strokeWidth?: number;
  thickness?: number;
};
```

`strokeWidth` defaults to `1` mm.

### `<Triangle>`

```ts
type TriangleProps = CommonProps & {
  width: number;
  height: number;
  thickness?: number;
};
```

`<Triangle>` is a centered isosceles triangle by default. Use `<Polygon>` for exact custom profiles.

### `<Polygon>`

```ts
type PolygonProps = CommonProps & {
  points: Array<[number, number]>;
  thickness?: number;
};
```

`points` are local `x/y` coordinates in millimeters. Polygons must be non-self-intersecting.

## 3D primitives

### `<Box>`

```ts
type BoxProps = CommonProps & {
  width: number;
  height: number;
  depth: number;
};
```

### `<Pyramid>`

```ts
type PyramidProps = CommonProps & {
  width: number;
  height: number;
  depth: number;
};
```

Base sits in the lower `x/z` plane; apex points along positive `y`.

### `<Cylinder>`

```ts
type CylinderProps = CommonProps & {
  radius: number;
  height: number;
  segments?: number;
};
```

Cylinder height runs along the `y` axis.

### `<Sphere>`

```ts
type SphereProps = CommonProps & {
  radius: number;
  segments?: number;
};
```

### `<Mesh>`

```ts
type MeshProps = CommonProps & {
  vertices: Array<[number, number, number]>;
  faces: Array<[number, number, number]>;
  validate?: "none" | "surface" | "solid";
  smooth?: boolean;
};
```

`<Mesh>` is official v0 but documented as an advanced escape hatch. STL export writes the same triangles used by the viewer. `validate` defaults to `"solid"` for export paths.

## Layout components

Layout components position their children; they do not imply booleans or containment.

Shared props:

```ts
type Align = "start" | "center" | "end";

type LayoutProps = CommonProps & {
  gap?: number;
  align?: Align;
};
```

### `<Horizontal>`

Lays children along the `x` axis.

### `<Vertical>`

Lays children along the `y` axis.

### `<Stack>`

Lays children along the `z` axis.

### `<Grid>`

```ts
type GridAxisConfig = {
  count?: number;
  gap?: number;
  size?: number | "auto";
};

type GridProps = CommonProps & {
  columns: GridAxisConfig;
  rows?: GridAxisConfig;
  align?: Align;
};
```

Rules:

- Default plane is `x/y`.
- Columns control `x`; rows control `y`.
- At least one of `columns.count` or `rows.count` is required.
- Default fill is row-major: left-to-right, then next row downward.
- `gap` defaults to `0`.

## Operations

### `<Cutout>`

```ts
type CutoutProps = {
  children: React.ReactNode;
};
```

`<Cutout>` subtracts its child geometry from the nearest solid ancestor.

Example:

```tsx
<Box width={80} height={4} depth={40}>
  <Cutout>
    <Cylinder radius={3} height={10} />
  </Cutout>
</Box>
```

The cutout geometry is visible in the viewer as a preview aid only when the UI chooses to show operation helpers; it is not exported as positive geometry.

