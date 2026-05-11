# Viewer circular preview artifact Playwright verification

This is the browser check used for the circular preview artifact fix.

```bash
REACT_CAD_RENDER_OPEN=0 node packages/react-cad-render/bin/react-cad-render.mjs examples/basic/design.tsx --port=5177
```

Playwright MCP steps:

1. Navigate to `http://127.0.0.1:5177`.
2. Wait for `Ready` in `[data-testid="viewer-status"]`.
3. Evaluate:

```js
async () => {
  const modelResponse = await fetch('/model.json?verify=preview-artifact-viewer-local-smoothing');
  const model = await modelResponse.json();
  const canvas = document.querySelector('canvas');
  return {
    readyText: document.querySelector('[data-testid=viewer-status]')?.textContent,
    meshCount: model.compiled.meshes.length,
    hasSmoothNormalsContract: model.compiled.meshes.some(mesh => 'smoothNormals' in mesh),
    triangleCount: model.compiled.meshes.reduce((count, mesh) => count + mesh.faces.length, 0),
    canvasSize: canvas ? {
      width: canvas.width,
      height: canvas.height,
      clientWidth: canvas.clientWidth,
      clientHeight: canvas.clientHeight,
    } : null,
    webglPresent: Boolean(canvas),
  };
}
```

Verified result:

```json
{
  "readyText": "Ready · 7 meshes · 836 triangles",
  "meshCount": 7,
  "hasSmoothNormalsContract": false,
  "triangleCount": 836,
  "canvasSize": { "width": 2400, "height": 2315, "clientWidth": 1200, "clientHeight": 1158 },
  "webglPresent": true
}
```

The screenshot inspection saved at `.pi/preview-artifact-viewer-local-smoothing.png` showed the circular holes and raised circles without axes/grid helper lines or internal cat-eye shading artifacts.
