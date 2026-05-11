# @jordyvd/react-cad-render

Local browser renderer for React CAD designs.

## Usage

```bash
npx @jordyvd/react-cad-render design.tsx
```

The CLI loads the design’s default export, starts a web UI bound to `0.0.0.0` by default, and prints local and LAN URLs. The viewer uses React Three Fiber/Three.js to render the cutout-aware compiled meshes.

For workspace development:

```bash
node packages/react-cad-render/bin/react-cad-render.mjs examples/basic/design.tsx
```

Use `--host=127.0.0.1` to restrict the viewer to this machine, or keep the default `--host=0.0.0.0` and open the printed `Network URL` from another computer on the same network.

## Viewer behavior

- Polls the design for live rebuilds while preserving the last valid model when practical.
- Shows build/export status, warnings, and validation errors in the page.
- Provides orbit/rotate/pan/zoom controls, keyboard rotate/zoom shortcuts, plus reset/zoom toolbar buttons.
- Includes a preview-only **Wireframe** toggle for inspecting mesh triangulation without changing STL export geometry.
- Exports binary STL through the **Export STL** button or `/model.stl`.
- Uses the same compiled model for preview and STL, so cutout results match the exported geometry.

## Validation helpers

```bash
node packages/react-cad-render/bin/react-cad-render.mjs examples/basic/design.tsx --smoke
node packages/react-cad-render/bin/react-cad-render.mjs examples/basic/design.tsx --validate-only
```

`--smoke` starts the server on an ephemeral port, fetches the viewer shell/model/STL, and exits. `--validate-only` evaluates the design and prints a model summary without starting the browser UI.
