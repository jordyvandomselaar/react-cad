/** @jsxImportSource react */
import React, { useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type { CompiledModel } from "@jordyvd/react-cad/geometry";
import { CadCanvas, type ViewCommand } from "./scene.js";

type ModelPayload = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  revision?: string;
  compiled?: CompiledModel;
};

type ViewerState = {
  status: "loading" | "ready" | "error" | "exporting";
  lastGoodCompiled?: CompiledModel;
  lastGoodRevision?: string;
  errors: string[];
  warnings: string[];
};

const MODEL_POLL_INTERVAL_MS = 750;

function App() {
  const [state, setState] = useState<ViewerState>({
    status: "loading",
    errors: [],
    warnings: [],
  });
  const [cameraVersion, setCameraVersion] = useState(0);
  const [viewCommand, setViewCommand] = useState<ViewCommand>();
  const [wireframe, setWireframe] = useState(false);

  const loadModel = useCallback(async () => {
    try {
      const response = await fetch(`/model.json?time=${Date.now()}`, { cache: "no-store" });
      const payload = await response.json() as ModelPayload;

      if (!response.ok || !payload.ok || !payload.compiled) {
        const nextErrors = payload.errors?.length ? payload.errors : ["Model failed to build."];
        const nextWarnings = payload.warnings ?? [];
        setState((current) => {
          if (current.status === "error" && sameMessages(current.errors, nextErrors) && sameMessages(current.warnings, nextWarnings)) {
            return current;
          }

          return {
            ...current,
            status: "error",
            errors: nextErrors,
            warnings: nextWarnings,
          };
        });
        return;
      }

      setState((current) => {
        const nextWarnings = payload.warnings ?? [];
        const status = current.status === "exporting" ? "exporting" : "ready";
        const modelRevisionUnchanged = current.lastGoodRevision === payload.revision;

        if (
          modelRevisionUnchanged &&
          current.status === status &&
          current.errors.length === 0 &&
          sameMessages(current.warnings, nextWarnings)
        ) {
          return current;
        }

        return {
          status,
          lastGoodCompiled: modelRevisionUnchanged ? current.lastGoodCompiled : payload.compiled,
          lastGoodRevision: payload.revision,
          errors: [],
          warnings: nextWarnings,
        };
      });
    } catch (error) {
      const nextErrors = [error instanceof Error ? error.message : String(error)];
      setState((current) => {
        if (current.status === "error" && sameMessages(current.errors, nextErrors)) {
          return current;
        }

        return {
          ...current,
          status: "error",
          errors: nextErrors,
        };
      });
    }
  }, []);

  useEffect(() => {
    void loadModel();
    const interval = window.setInterval(() => {
      void loadModel();
    }, MODEL_POLL_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [loadModel]);

  const exportStl = useCallback(async () => {
    if (state.status === "exporting" || !state.lastGoodCompiled || !state.lastGoodRevision) return;

    setState((current) => ({ ...current, status: "exporting" }));

    try {
      const response = await fetch(`/model.stl?revision=${encodeURIComponent(state.lastGoodRevision)}`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(await responseErrorMessage(response));
      }

      const blob = await response.blob();
      if (blob.size <= 84) {
        throw new Error("STL export was empty.");
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "react-cad-model.stl";
      link.click();
      URL.revokeObjectURL(url);
      setState((current) => ({ ...current, status: current.errors.length > 0 ? "error" : "ready" }));
    } catch (error) {
      setState((current) => ({
        ...current,
        status: "error",
        errors: [error instanceof Error ? error.message : String(error)],
      }));
    }
  }, [state.lastGoodCompiled, state.lastGoodRevision, state.status]);

  const sendViewCommand = useCallback((action: ViewCommand["action"]) => {
    setViewCommand((current) => ({ id: (current?.id ?? 0) + 1, action }));
  }, []);

  const handleViewportKeyDown = useCallback((event: React.KeyboardEvent<HTMLElement>) => {
    const commandByKey: Record<string, ViewCommand["action"] | undefined> = {
      ArrowLeft: "rotate-left",
      ArrowRight: "rotate-right",
      ArrowUp: "rotate-up",
      ArrowDown: "rotate-down",
      "+": "zoom-in",
      "=": "zoom-in",
      "-": "zoom-out",
      _: "zoom-out",
    };
    const command = commandByKey[event.key];
    if (!command) return;

    event.preventDefault();
    sendViewCommand(command);
  }, [sendViewCommand]);

  const compiled = state.lastGoodCompiled;
  const meshCount = compiled?.meshes.length ?? 0;
  const triangleCount = compiled?.meshes.reduce((count, mesh) => count + mesh.faces.length, 0) ?? 0;
  const canExport = state.status !== "exporting" && Boolean(compiled) && Boolean(state.lastGoodRevision);
  const entrypoint = document.querySelector<HTMLElement>("#react-cad-viewer-root")?.dataset.entrypoint;

  return (
    <main className="app-shell">
      <header className="toolbar">
        <div>
          <h1>React CAD Renderer</h1>
          <p>{entrypoint}</p>
        </div>
        <div className="toolbar-actions">
          <span data-testid="viewer-status" className={`status status-${state.status}`} role="status" aria-live="polite">
            {state.status === "ready" ? `Ready · ${meshCount} mesh${meshCount === 1 ? "" : "es"} · ${triangleCount} triangles` : state.status}
          </span>
          <button type="button" onClick={() => setCameraVersion((version) => version + 1)} data-testid="reset-camera">
            Reset camera
          </button>
          <button type="button" onClick={() => sendViewCommand("zoom-in")} disabled={!compiled} data-testid="zoom-in">
            Zoom in
          </button>
          <button type="button" onClick={() => sendViewCommand("zoom-out")} disabled={!compiled} data-testid="zoom-out">
            Zoom out
          </button>
          <button
            type="button"
            onClick={() => setWireframe((current) => !current)}
            data-testid="wireframe-toggle"
            aria-pressed={wireframe}
            disabled={!compiled}
          >
            Wireframe
          </button>
          <button type="button" onClick={() => void exportStl()} data-testid="export-stl" disabled={!canExport} aria-busy={state.status === "exporting"}>
            Export STL
          </button>
        </div>
      </header>

      {state.errors.length > 0 ? (
        <section className="message message-error" data-testid="viewer-errors" role="alert">
          {state.errors.map((error) => <p key={error}>{error}</p>)}
          {compiled && state.lastGoodRevision ? <p>Showing the last valid preview. Export STL will use that last valid revision.</p> : null}
        </section>
      ) : null}

      {state.warnings.length > 0 ? (
        <section className="message message-warning" data-testid="viewer-warnings" role="status" aria-live="polite">
          {state.warnings.map((warning) => <p key={warning}>{warning}</p>)}
        </section>
      ) : null}

      <section
        className="viewport"
        data-testid="cad-viewport"
        role="region"
        aria-label="Interactive 3D CAD preview"
        aria-describedby="cad-viewport-instructions"
        tabIndex={0}
        onKeyDown={handleViewportKeyDown}
      >
        <p id="cad-viewport-instructions" className="sr-only">
          Drag with a mouse or touch to orbit the model, scroll to zoom, use arrow keys to rotate, plus and minus to zoom, and use the Reset camera button to restore the default view.
        </p>
        {compiled ? <CadCanvas key={cameraVersion} compiled={compiled} viewCommand={viewCommand} wireframe={wireframe} /> : <EmptyViewport status={state.status} />}
      </section>
    </main>
  );
}

function sameMessages(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((message, index) => message === right[index]);
}

function EmptyViewport({ status }: { status: ViewerState["status"] }) {
  if (status === "error") {
    return <div className="empty-state">No valid model to preview yet. Fix the build errors above and the viewer will retry automatically.</div>;
  }

  return <div className="empty-state">Loading model…</div>;
}

async function responseErrorMessage(response: Response): Promise<string> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const payload = await response.json() as { errors?: string[] };
    if (payload.errors?.length) return payload.errors.join("\n");
  }

  const text = await response.text();
  return text || `Request failed with ${response.status}`;
}

const rootElement = document.querySelector("#react-cad-viewer-root");
if (!rootElement) {
  throw new Error("Missing #react-cad-viewer-root element.");
}

createRoot(rootElement).render(<App />);
