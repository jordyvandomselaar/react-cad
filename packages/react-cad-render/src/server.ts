import { createServer as createHttpServer, type Server, type ServerResponse } from "node:http";
import { createHash } from "node:crypto";
import { networkInterfaces } from "node:os";
import { spawn } from "node:child_process";
import { stat } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderDesign, summarizeModel, validateModel, type CadNode } from "@jordyvd/react-cad/runtime";
import { compileModelWithCutouts } from "@jordyvd/react-cad/geometry";
import { exportBinaryStl } from "@jordyvd/react-cad/export";
import { createServer as createViteServer, type Plugin, type ViteDevServer } from "vite";

const DEFAULT_PORT = 5173;
const DEFAULT_HOST = "0.0.0.0";
const PACKAGE_ROOT = resolve(fileURLToPath(import.meta.url), "../..");
const VIEWER_ENTRYPOINT = fileURLToPath(new URL("./viewer/main.js", import.meta.url));

type CliOptions = {
  entrypoint?: string;
  host: string;
  port: number;
  smoke: boolean;
  validateOnly: boolean;
};

type ImportedDesignModule = {
  default?: unknown;
};

type ModelPayload = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  summary: Record<string, number>;
  revision?: string;
  model?: CadNode;
  compiled?: Awaited<ReturnType<typeof compileModelWithCutouts>>;
};

type ServerState = {
  snapshots: Map<string, Awaited<ReturnType<typeof compileModelWithCutouts>>>;
};

export async function runCli(argv: string[]): Promise<void> {
  const options = parseArgs(argv);

  if (!options.entrypoint) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  if (options.validateOnly) {
    const { model, compiled } = await buildEntrypoint(options.entrypoint);
    printWarnings(compiled.warnings);
    exportBinaryStl(compiled, options.entrypoint);
    console.log(`Validated ${options.entrypoint}`);
    console.log(JSON.stringify(summarizeModel(model), null, 2));
    return;
  }

  const server = await createReactCadServer({ entrypoint: options.entrypoint });
  const port = options.smoke ? 0 : options.port;

  await listen(server, port, options.host);
  const address = server.address();
  const actualPort = typeof address === "object" && address ? address.port : port;
  const url = viewerUrl(options.host, actualPort);

  if (options.smoke) {
    try {
      await runSmoke(url);
      console.log(`Smoke validation passed at ${url}`);
    } finally {
      await close(server);
    }
    return;
  }

  openBrowser(url);
  console.log(`React CAD renderer running at ${url}`);
  for (const networkUrl of networkViewerUrls(options.host, actualPort)) {
    console.log(`Network URL: ${networkUrl}`);
  }
  console.log(`Entrypoint: ${options.entrypoint}`);
}

function openBrowser(url: string): void {
  if (process.env.CI || process.env.REACT_CAD_RENDER_OPEN === "0") return;

  const command = process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  const child = spawn(command, args, { detached: true, stdio: "ignore" });
  child.on("error", () => undefined);
  child.unref();
}

export async function createReactCadServer({ entrypoint }: { entrypoint: string }): Promise<Server> {
  const vite = await createViewerViteServer();
  const state: ServerState = { snapshots: new Map() };
  const server = createHttpServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");

      if (url.pathname === "/healthz") {
        sendJson(response, { ok: true });
        return;
      }

      if (url.pathname === "/favicon.ico") {
        response.writeHead(204);
        response.end();
        return;
      }

      if (url.pathname === "/@vite/client") {
        sendJavaScript(response, viteClientShim());
        return;
      }

      if (url.pathname === "/viewer/main.js") {
        await sendTransformedViewer(vite, response);
        return;
      }

      if (url.pathname === "/model.json") {
        const payload = await buildModelPayload(entrypoint, vite, state);
        sendJson(response, payload);
        return;
      }

      if (url.pathname === "/model.stl") {
        const compiled = await loadCompiledModelForExport(entrypoint, vite, url, state);
        const stl = exportBinaryStl(compiled, entrypoint);
        const headers: Record<string, string> = {
          "content-type": "model/stl",
          "content-disposition": "attachment; filename=react-cad-model.stl",
        };
        if (compiled.warnings.length > 0) {
          headers["x-react-cad-warnings"] = encodeURIComponent(JSON.stringify(compiled.warnings));
        }
        response.writeHead(200, headers);
        response.end(stl);
        return;
      }

      if (url.pathname === "/") {
        sendHtml(response, viewerHtml(entrypoint));
        return;
      }

      vite.middlewares(request, response, (error?: unknown) => {
        if (error) {
          sendJson(response, { ok: false, errors: [error instanceof Error ? error.message : String(error)] }, 500);
          return;
        }
        sendText(response, "Not found", 404);
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.startsWith("No preview snapshot exists")) {
        console.error(message);
      }
      sendJson(response, {
        ok: false,
        errors: [message],
      }, 500);
    }
  });

  server.on("close", () => {
    void vite.close();
  });

  return server;
}

export async function loadModel(entrypoint: string, vite?: ViteDevServer): Promise<CadNode> {
  if (!vite) {
    const oneShotVite = await createViewerViteServer();
    try {
      return await loadModel(entrypoint, oneShotVite);
    } finally {
      await oneShotVite.close();
    }
  }

  const absoluteEntrypoint = resolve(entrypoint);
  const entrypointStat = await stat(absoluteEntrypoint);
  const module = await importEntrypoint(absoluteEntrypoint, entrypointStat.mtimeMs, vite);

  if (!("default" in module)) {
    throw new Error(`Design entrypoint must default-export a design component: ${entrypoint}`);
  }

  return renderDesign(module.default);
}

async function buildEntrypoint(entrypoint: string): Promise<{ model: CadNode; compiled: Awaited<ReturnType<typeof compileModelWithCutouts>> }> {
  const model = await loadModel(entrypoint);
  const validation = validateModel(model);
  if (!validation.ok) {
    throw new Error(validation.errors.join("\n"));
  }

  const compiled = await compileModelWithCutouts(model);
  if (!compiled.ok) {
    throw new Error(compiled.errors.join("\n"));
  }

  return { model, compiled };
}

function printWarnings(warnings: string[]): void {
  for (const warning of warnings) {
    console.warn(`Warning: ${warning}`);
  }
}

async function importEntrypoint(absoluteEntrypoint: string, mtimeMs: number, vite: ViteDevServer): Promise<ImportedDesignModule> {
  vite.moduleGraph.invalidateAll();
  return vite.ssrLoadModule(`${absoluteEntrypoint}?t=${Math.trunc(mtimeMs)}`) as Promise<ImportedDesignModule>;
}

async function buildModelPayload(entrypoint: string, vite: ViteDevServer, state: ServerState): Promise<ModelPayload> {
  try {
    const model = await loadModel(entrypoint, vite);
    const validation = validateModel(model);
    const compiled = validation.ok ? await compileModelWithCutouts(model) : undefined;
    const ok = validation.ok && (compiled?.ok ?? true);
    const revision = ok && compiled ? rememberSnapshot(state, compiled) : undefined;

    return {
      ok,
      errors: [...validation.errors, ...(compiled?.errors ?? [])],
      warnings: compiled?.warnings ?? [],
      summary: summarizeModel(model),
      revision,
      model,
      compiled,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`React CAD model error for ${entrypoint}: ${message}`);
    return {
      ok: false,
      errors: [message],
      warnings: [],
      summary: {},
    };
  }
}

async function loadCompiledModelForExport(entrypoint: string, vite: ViteDevServer, url: URL, state: ServerState): Promise<Awaited<ReturnType<typeof compileModelWithCutouts>>> {
  const revision = url.searchParams.get("revision");
  if (revision) {
    const snapshot = state.snapshots.get(revision);
    if (!snapshot) {
      throw new Error(`No preview snapshot exists for revision ${revision}. Wait for the viewer to rebuild, then export again.`);
    }
    return snapshot;
  }

  const model = await loadModel(entrypoint, vite);
  return compileModelWithCutouts(model);
}

function rememberSnapshot(state: ServerState, compiled: Awaited<ReturnType<typeof compileModelWithCutouts>>): string {
  const revision = createHash("sha256").update(JSON.stringify(compiled)).digest("hex").slice(0, 16);
  if (!state.snapshots.has(revision)) {
    state.snapshots.set(revision, compiled);
  }

  while (state.snapshots.size > 10) {
    const oldestRevision = state.snapshots.keys().next().value;
    if (!oldestRevision) break;
    state.snapshots.delete(oldestRevision);
  }

  return revision;
}


async function sendTransformedViewer(vite: ViteDevServer, response: ServerResponse): Promise<void> {
  const source = await vite.transformRequest(VIEWER_ENTRYPOINT);
  if (!source) {
    sendText(response, "Viewer entrypoint not found", 404);
    return;
  }

  sendJavaScript(response, source.code);
}

function createViewerViteServer(): Promise<ViteDevServer> {
  return createViteServer({
    appType: "custom",
    logLevel: "error",
    root: PACKAGE_ROOT,
    plugins: [rendererDependencyResolver()],
    esbuild: {
      jsx: "automatic",
      jsxImportSource: "@jordyvd/react-cad",
    },
    server: {
      middlewareMode: true,
      hmr: false,
      ws: false,
      fs: { allow: [PACKAGE_ROOT] },
    },
  });
}

function rendererDependencyResolver(): Plugin {
  return {
    name: "react-cad-renderer-dependency-resolver",
    enforce: "pre",
    resolveId(source, _importer, options) {
      if (options.ssr && source === "react/jsx-runtime") {
        return fileURLToPath(import.meta.resolve("@jordyvd/react-cad/jsx-runtime"));
      }

      if (options.ssr && source === "react/jsx-dev-runtime") {
        return fileURLToPath(import.meta.resolve("@jordyvd/react-cad/jsx-dev-runtime"));
      }

      if (!isRendererProvidedReactCadDependency(source)) return undefined;
      return fileURLToPath(import.meta.resolve(source));
    },

  };
}

function isRendererProvidedReactCadDependency(source: string): boolean {
  return source === "@jordyvd/react-cad"
    || source.startsWith("@jordyvd/react-cad/");
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    entrypoint: undefined,
    host: DEFAULT_HOST,
    port: DEFAULT_PORT,
    smoke: false,
    validateOnly: false,
  };

  for (const arg of argv) {
    if (arg === "--smoke") {
      options.smoke = true;
    } else if (arg === "--validate-only") {
      options.validateOnly = true;
    } else if (arg.startsWith("--host=")) {
      options.host = arg.slice("--host=".length);
    } else if (arg.startsWith("--port=")) {
      options.port = Number(arg.slice("--port=".length));
    } else if (!options.entrypoint) {
      options.entrypoint = arg;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function printUsage(): void {
  console.error("Usage: react-cad-render <design.tsx> [--smoke] [--validate-only] [--host=0.0.0.0] [--port=5173]");
}

function viewerHtml(entrypoint: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>React CAD Renderer</title>
    <style>:root {
  color-scheme: dark;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: #020617;
  color: #f8fafc;
}

body {
  margin: 0;
}

button {
  border: 1px solid #475569;
  border-radius: 8px;
  padding: 8px 12px;
  background: #1e293b;
  color: #f8fafc;
  cursor: pointer;
}

button:hover {
  background: #334155;
}

.toolbar-actions button[aria-pressed="true"] {
  border-color: #38bdf8;
  background: #0369a1;
  color: #f0f9ff;
  box-shadow: 0 0 0 1px rgba(56, 189, 248, 0.38), inset 0 0 0 1px rgba(240, 249, 255, 0.08);
}

.toolbar-actions button[aria-pressed="true"]:hover {
  background: #0284c7;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.app-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 18px;
  border-bottom: 1px solid #1e293b;
  background: #0f172a;
}

.toolbar h1 {
  margin: 0;
  font-size: 18px;
}

.toolbar p {
  margin: 4px 0 0;
  color: #94a3b8;
  font-size: 13px;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.status {
  border-radius: 999px;
  padding: 6px 10px;
  background: #172554;
  color: #bfdbfe;
  font-size: 13px;
}

.status-error {
  background: #7f1d1d;
  color: #fecaca;
}

.status-exporting,
.status-loading {
  background: #713f12;
  color: #fde68a;
}

.message {
  padding: 10px 18px;
  border-bottom: 1px solid #334155;
}

.message p {
  margin: 4px 0;
}

.message-error {
  background: #450a0a;
  color: #fecaca;
}

.message-warning {
  background: #422006;
  color: #fed7aa;
}

.viewport {
  flex: 1 1 auto;
  min-height: 0;
  position: relative;
  outline: none;
  overflow: hidden;
}

.viewport:focus-visible {
  box-shadow: inset 0 0 0 3px #38bdf8;
}

.viewport canvas {
  display: block;
  height: 100% !important;
  width: 100% !important;
}

.sr-only {
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
  position: absolute;
}

.empty-state {
  display: grid;
  min-height: 60vh;
  place-items: center;
  color: #94a3b8;
}
</style>
  </head>
  <body>
    <div id="react-cad-viewer-root" data-entrypoint="${escapeHtml(entrypoint)}"></div>
    <script type="module" src="/viewer/main.js"></script>
  </body>
</html>`;
}

function viteClientShim(): string {
  return `
export const createHotContext = () => ({
  accept() {},
  prune() {},
  dispose() {},
  decline() {},
  invalidate() {},
  on() {},
  off() {},
  send() {},
  data: {},
});

export function updateStyle(id, css) {
  let style = document.querySelector(\`style[data-vite-dev-id="\${id}"]\`);
  if (!style) {
    style = document.createElement("style");
    style.setAttribute("data-vite-dev-id", id);
    document.head.appendChild(style);
  }
  style.textContent = css;
}

export function removeStyle(id) {
  document.querySelector(\`style[data-vite-dev-id="\${id}"]\`)?.remove();
}
`;
}

async function runSmoke(url: string): Promise<void> {
  const health = await fetchJson<{ ok: boolean }>(`${url}/healthz`);
  if (!health.ok) throw new Error("Health check failed.");

  const model = await fetchJson<{ ok: boolean; errors: string[]; revision?: string; summary: Record<string, number>; compiled?: { bounds: { min: number[]; max: number[]; size: number[] }; meshes: Array<{ faces: unknown[] }> } }>(`${url}/model.json`);
  if (!model.ok) throw new Error(`Model validation failed: ${model.errors.join("; ")}`);
  if (!model.revision) throw new Error("Model response did not include a preview revision.");
  if (!model.summary.Scene) throw new Error("Model summary did not include a Scene node.");
  if (!model.compiled?.meshes.length) throw new Error("Compiled model did not include preview/export meshes.");
  const previewTriangleCount = model.compiled.meshes.reduce((count, mesh) => count + mesh.faces.length, 0);

  const missingRevision = await fetch(`${url}/model.stl?revision=missing-revision`);
  if (missingRevision.ok) {
    throw new Error("STL export unexpectedly succeeded for an unknown preview revision.");
  }

  const stl = await fetch(`${url}/model.stl?revision=${encodeURIComponent(model.revision)}`);
  const stlBytes = new Uint8Array(await stl.arrayBuffer());
  if (!stl.ok || stlBytes.byteLength <= 84) {
    throw new Error("STL export did not return a non-empty binary STL.");
  }
  const stlSummary = summarizeBinaryStl(stlBytes);
  if (stlSummary.triangleCount !== previewTriangleCount) {
    throw new Error(`STL triangle count ${stlSummary.triangleCount} did not match preview triangle count ${previewTriangleCount}.`);
  }
  if (JSON.stringify(stlSummary.bounds.size) !== JSON.stringify(model.compiled.bounds.size.map(roundForSmoke))) {
    throw new Error(`STL bounds ${JSON.stringify(stlSummary.bounds)} did not match preview bounds ${JSON.stringify(model.compiled.bounds)}.`);
  }

  const root = await fetch(`${url}/`);
  const html = await root.text();
  if (!root.ok || !html.includes("react-cad-viewer-root")) {
    throw new Error("Viewer shell did not load.");
  }
}

function summarizeBinaryStl(stl: Uint8Array): { triangleCount: number; bounds: { min: number[]; max: number[]; size: number[] } } {
  const view = new DataView(stl.buffer, stl.byteOffset, stl.byteLength);
  const triangleCount = view.getUint32(80, true);
  const vertices: number[][] = [];

  for (let triangle = 0; triangle < triangleCount; triangle += 1) {
    const triangleOffset = 84 + triangle * 50;
    for (let vertex = 0; vertex < 3; vertex += 1) {
      const vertexOffset = triangleOffset + 12 + vertex * 12;
      vertices.push([
        view.getFloat32(vertexOffset, true),
        view.getFloat32(vertexOffset + 4, true),
        view.getFloat32(vertexOffset + 8, true),
      ]);
    }
  }

  const min = [0, 1, 2].map((axis) => roundForSmoke(Math.min(...vertices.map((vertex) => vertex[axis]))));
  const max = [0, 1, 2].map((axis) => roundForSmoke(Math.max(...vertices.map((vertex) => vertex[axis]))));
  return {
    triangleCount,
    bounds: {
      min,
      max,
      size: max.map((value, axis) => roundForSmoke(value - min[axis])),
    },
  };
}

function roundForSmoke(value: number): number {
  return Math.round(value * 1000) / 1000;
}

async function fetchJson<Payload>(url: string): Promise<Payload> {
  const response = await fetch(url);
  const payload = await response.json() as Payload;
  if (!response.ok) {
    throw new Error(`Request failed ${response.status}: ${JSON.stringify(payload)}`);
  }
  return payload;
}

function sendJson(response: ServerResponse, payload: unknown, status = 200): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload, null, 2));
}

function sendHtml(response: ServerResponse, html: string, status = 200): void {
  response.writeHead(status, { "content-type": "text/html; charset=utf-8" });
  response.end(html);
}

function sendJavaScript(response: ServerResponse, code: string, status = 200): void {
  response.writeHead(status, { "content-type": "text/javascript; charset=utf-8" });
  response.end(code);
}

function sendText(response: ServerResponse, text: string, status = 200): void {
  response.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
  response.end(text);
}

function viewerUrl(host: string, port: number): string {
  return `http://${hostForLocalUrl(host)}:${port}`;
}

function hostForLocalUrl(host: string): string {
  return host === "0.0.0.0" || host === "::" ? "127.0.0.1" : host;
}

function networkViewerUrls(host: string, port: number): string[] {
  if (host !== "0.0.0.0" && host !== "::") return [];

  const urls = new Set<string>();
  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family !== "IPv4" || address.internal) continue;
      urls.add(`http://${address.address}:${port}`);
    }
  }
  return [...urls];
}

function listen(server: Server, port: number, host: string): Promise<void> {
  return new Promise((resolveListen) => {
    server.listen(port, host, resolveListen);
  });
}

function close(server: Server): Promise<void> {
  return new Promise((resolveClose, rejectClose) => {
    server.close((error) => {
      if (error) rejectClose(error);
      else resolveClose();
    });
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

