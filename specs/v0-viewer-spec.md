# v0 Viewer Spec — `@jordyvd/react-cad-render`

## Command

```bash
npx @jordyvd/react-cad-render design.tsx
```

## Responsibilities

- Load and evaluate a `.tsx` design entrypoint.
- Start a local web UI.
- Open the browser automatically when possible.
- Watch source files and live-reload the model.
- Render the full evaluated model using `react-three-fiber`.
- Provide STL export.
- Show actionable build/model/export errors.

## Entrypoint contract

The design file default-exports a React component:

```tsx
export default function Design() {
  return <Box width={40} height={10} depth={20} />;
}
```

If the default export is missing or invalid, the browser UI and terminal should both show a clear error.

## Browser UI

Minimum UI:

- 3D viewport.
- Orbit/rotate/pan/zoom controls.
- Reset camera button.
- Export STL button.
- Error overlay.
- Reload/build status indicator.

Nice-to-have if cheap:

- World axes indicator.
- Millimeter grid toggle.
- Model bounds display.
- Toggle operation helper visibility for cutouts.

## Rendering behavior

- Use `react-three-fiber` for the interactive Three.js scene.
- Render the mesh output from the shared geometry core.
- Preserve preview colors.
- Show cutout result, not the pre-cut solid.
- On errors, keep showing the last valid model when possible.

## Live reload

- Watch `design.tsx` and files it imports when possible.
- Rebuild/evaluate on change.
- Push updated model to the browser without command restart.
- Preserve camera position across reloads when possible.

## Export behavior

- Export button writes/downloads STL for the current evaluated model.
- Export must run the same validation path as command-line/export code.
- If export fails, show a user-facing error with the invalid node/name when possible.

## Terminal output

Terminal output should stay boring:

- local URL
- build status
- validation/export errors
- exported file path if applicable

No rich visual output in terminal.

