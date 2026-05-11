# v0 Product Spec — First Printable Loop

## Product thesis

A React developer should be able to create a small printable object, preview it live, tweak it like a component tree, and export a FreeCAD-loadable STL without learning traditional CAD first.

## Target user

- Knows React, JSX, components, props, and maybe CSS layout ideas.
- Does **not** need to know CAD terminology.
- Wants to design small physical objects, printable parts, plates, brackets, enclosures, or prototypes.

## v0 goals

1. Author CAD designs as React components in `.tsx`.
2. Use beginner-friendly primitives and layout components.
3. Support custom React components without registration.
4. Preview the full evaluated model in a browser, including cutouts.
5. Export STL that opens in FreeCAD and can feed a 3D-printing workflow.
6. Keep all packages in one monorepo.

## v0 non-goals

- STEP export.
- Editable FreeCAD-native document export.
- Full CSS layout compatibility.
- Constraint-based sketches.
- Professional CAD feature completeness.
- Importing existing CAD files.
- Advanced helpers like threads, gears, fillets, chamfers, revolve, or sweep.

## Canonical v0 demo

A simple printable plate/card with repeated holes or raised shapes.

The demo must prove:

- custom React components
- 2D primitives with default thickness
- 3D primitives
- `<Horizontal>`, `<Vertical>`, `<Stack>`, and `<Grid>`
- parent-relative positioning
- `<Cutout>` holes/subtraction
- full browser preview through `@jordyvd/react-cad-render`
- STL export that opens in FreeCAD

## Success criteria

- A user can run:

```bash
npx @jordyvd/react-cad-render design.tsx
```

- The browser opens automatically or prints a clickable local URL.
- Editing `design.tsx` updates the browser preview without restarting the command.
- Viewer renders the final model after cutouts, not just raw primitives.
- User can export an STL from the viewer.
- Exported STL opens in FreeCAD at millimeter scale.
- Common authoring mistakes produce actionable messages.

