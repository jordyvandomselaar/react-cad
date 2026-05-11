import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/** @jsxImportSource react */
import { useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { CadCanvas } from "./scene.js";
const MODEL_POLL_INTERVAL_MS = 750;
function App() {
    const [state, setState] = useState({
        status: "loading",
        errors: [],
        warnings: [],
    });
    const [cameraVersion, setCameraVersion] = useState(0);
    const [viewCommand, setViewCommand] = useState();
    const [wireframe, setWireframe] = useState(false);
    const loadModel = useCallback(async () => {
        try {
            const response = await fetch(`/model.json?time=${Date.now()}`, { cache: "no-store" });
            const payload = await response.json();
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
                if (modelRevisionUnchanged &&
                    current.status === status &&
                    current.errors.length === 0 &&
                    sameMessages(current.warnings, nextWarnings)) {
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
        }
        catch (error) {
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
        if (state.status === "exporting" || !state.lastGoodCompiled || !state.lastGoodRevision)
            return;
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
        }
        catch (error) {
            setState((current) => ({
                ...current,
                status: "error",
                errors: [error instanceof Error ? error.message : String(error)],
            }));
        }
    }, [state.lastGoodCompiled, state.lastGoodRevision, state.status]);
    const sendViewCommand = useCallback((action) => {
        setViewCommand((current) => ({ id: (current?.id ?? 0) + 1, action }));
    }, []);
    const handleViewportKeyDown = useCallback((event) => {
        const commandByKey = {
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
        if (!command)
            return;
        event.preventDefault();
        sendViewCommand(command);
    }, [sendViewCommand]);
    const compiled = state.lastGoodCompiled;
    const meshCount = compiled?.meshes.length ?? 0;
    const triangleCount = compiled?.meshes.reduce((count, mesh) => count + mesh.faces.length, 0) ?? 0;
    const canExport = state.status !== "exporting" && Boolean(compiled) && Boolean(state.lastGoodRevision);
    const entrypoint = document.querySelector("#react-cad-viewer-root")?.dataset.entrypoint;
    return (_jsxs("main", { className: "app-shell", children: [_jsxs("header", { className: "toolbar", children: [_jsxs("div", { children: [_jsx("h1", { children: "React CAD Renderer" }), _jsx("p", { children: entrypoint })] }), _jsxs("div", { className: "toolbar-actions", children: [_jsx("span", { "data-testid": "viewer-status", className: `status status-${state.status}`, role: "status", "aria-live": "polite", children: state.status === "ready" ? `Ready · ${meshCount} mesh${meshCount === 1 ? "" : "es"} · ${triangleCount} triangles` : state.status }), _jsx("button", { type: "button", onClick: () => setCameraVersion((version) => version + 1), "data-testid": "reset-camera", children: "Reset camera" }), _jsx("button", { type: "button", onClick: () => sendViewCommand("zoom-in"), disabled: !compiled, "data-testid": "zoom-in", children: "Zoom in" }), _jsx("button", { type: "button", onClick: () => sendViewCommand("zoom-out"), disabled: !compiled, "data-testid": "zoom-out", children: "Zoom out" }), _jsx("button", { type: "button", onClick: () => setWireframe((current) => !current), "data-testid": "wireframe-toggle", "aria-pressed": wireframe, disabled: !compiled, children: "Wireframe" }), _jsx("button", { type: "button", onClick: () => void exportStl(), "data-testid": "export-stl", disabled: !canExport, "aria-busy": state.status === "exporting", children: "Export STL" })] })] }), state.errors.length > 0 ? (_jsxs("section", { className: "message message-error", "data-testid": "viewer-errors", role: "alert", children: [state.errors.map((error) => _jsx("p", { children: error }, error)), compiled && state.lastGoodRevision ? _jsx("p", { children: "Showing the last valid preview. Export STL will use that last valid revision." }) : null] })) : null, state.warnings.length > 0 ? (_jsx("section", { className: "message message-warning", "data-testid": "viewer-warnings", role: "status", "aria-live": "polite", children: state.warnings.map((warning) => _jsx("p", { children: warning }, warning)) })) : null, _jsxs("section", { className: "viewport", "data-testid": "cad-viewport", role: "region", "aria-label": "Interactive 3D CAD preview", "aria-describedby": "cad-viewport-instructions", tabIndex: 0, onKeyDown: handleViewportKeyDown, children: [_jsx("p", { id: "cad-viewport-instructions", className: "sr-only", children: "Drag with a mouse or touch to orbit the model, scroll to zoom, use arrow keys to rotate, plus and minus to zoom, and use the Reset camera button to restore the default view." }), compiled ? _jsx(CadCanvas, { compiled: compiled, viewCommand: viewCommand, wireframe: wireframe }, cameraVersion) : _jsx(EmptyViewport, { status: state.status })] })] }));
}
function sameMessages(left, right) {
    return left.length === right.length && left.every((message, index) => message === right[index]);
}
function EmptyViewport({ status }) {
    if (status === "error") {
        return _jsx("div", { className: "empty-state", children: "No valid model to preview yet. Fix the build errors above and the viewer will retry automatically." });
    }
    return _jsx("div", { className: "empty-state", children: "Loading model\u2026" });
}
async function responseErrorMessage(response) {
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
        const payload = await response.json();
        if (payload.errors?.length)
            return payload.errors.join("\n");
    }
    const text = await response.text();
    return text || `Request failed with ${response.status}`;
}
const rootElement = document.querySelector("#react-cad-viewer-root");
if (!rootElement) {
    throw new Error("Missing #react-cad-viewer-root element.");
}
createRoot(rootElement).render(_jsx(App, {}));
