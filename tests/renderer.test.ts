import { describe, expect, it, vi } from "vitest";
import type { Server } from "node:http";
import type * as THREE from "three";
import { summarizeModel } from "@jordyvd/react-cad/runtime";
import { createReactCadServer, loadModel } from "../packages/react-cad-render/src/server.ts";
import { buildPreviewGeometry } from "../packages/react-cad-render/src/viewer/scene.tsx";

describe("React CAD renderer design loading", () => {
  it("loads static JSX designs through the renderer SSR path", async () => {
    const model = await loadModel("examples/basic/design.tsx");
    const summary = summarizeModel(model);
    const nodeCount = Object.values(summary).reduce((count, value) => count + value, 0);

    expect(summary.Scene).toBe(1);
    expect(nodeCount).toBeGreaterThan(1);
  });

  it("keeps the interactive server running when the initial design cannot build", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const server = await createReactCadServer({ entrypoint: "tests/fixtures/missing-design.tsx" });

    try {
      const url = await listen(server);
      const response = await fetch(`${url}/model.json`);
      const payload = await response.json() as { ok: boolean; errors: string[] };

      expect(response.ok).toBe(true);
      expect(payload.ok).toBe(false);
      expect(payload.errors.join("\n")).toMatch(/no such file or directory|Cannot find module/);
    } finally {
      await close(server);
      consoleError.mockRestore();
    }
  });

  it("can bind the interactive server to all network interfaces", async () => {
    const server = await createReactCadServer({ entrypoint: "examples/basic/design.tsx" });

    try {
      const url = await listen(server, "0.0.0.0");
      const response = await fetch(`${url}/healthz`);
      const payload = await response.json() as { ok: boolean };

      expect(response.ok).toBe(true);
      expect(payload.ok).toBe(true);
    } finally {
      await close(server);
    }
  });

});

describe("React CAD preview geometry", () => {
  it("smooths primitive side faces while preserving hard creases and custom mesh normals", () => {
    const shallowSmooth = buildPreviewGeometry({
      path: "smooth-corner",
      type: "Circle",
      vertices: [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 1, 0.25]],
      faces: [[0, 1, 2], [0, 1, 3]],
    });
    const hardCrease = buildPreviewGeometry({
      path: "hard-corner",
      type: "Circle",
      vertices: [[0, 0, 0], [1, 0, 0], [0, 0, 1], [0, 1, 0]],
      faces: [[0, 2, 1], [0, 1, 3]],
    });
    const customMesh = buildPreviewGeometry({
      path: "custom-mesh",
      type: "Mesh",
      vertices: [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 1, 0.25]],
      faces: [[0, 1, 2], [0, 1, 3]],
    });

    try {
      expect(normals(shallowSmooth, 0)).toEqual(normals(shallowSmooth, 3));
      expect(normals(hardCrease, 0)).toEqual([0, 1, 0]);
      expect(normals(hardCrease, 3)).toEqual([0, 0, 1]);
      expect(normals(customMesh, 0)).not.toEqual(normals(customMesh, 3));
    } finally {
      shallowSmooth.dispose();
      hardCrease.dispose();
      customMesh.dispose();
    }
  });
});

function listen(server: Server, host = "127.0.0.1"): Promise<string> {
  return new Promise((resolveListen) => {
    server.listen(0, host, () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolveListen(`http://127.0.0.1:${port}`);
    });
  });
}

function normals(geometry: THREE.BufferGeometry, vertexIndex: number): number[] {
  return Array.from(geometry.getAttribute("normal").array.slice(vertexIndex * 3, vertexIndex * 3 + 3)).map((value) => Math.round(value * 1000) / 1000);
}

function close(server: Server): Promise<void> {
  return new Promise((resolveClose, rejectClose) => {
    server.close((error) => {
      if (error) rejectClose(error);
      else resolveClose();
    });
  });
}
