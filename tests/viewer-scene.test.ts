import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import type { ReactElement, ReactNode } from "react";
import type { CompiledMesh, CompiledModel } from "@jordyvd/react-cad/geometry";

type ElementProps = {
  children?: ReactNode;
  [key: string]: unknown;
};

const requireFromTest = createRequire(import.meta.url);
const reactCadRenderRoot = fileURLToPath(new URL("../packages/react-cad-render/", import.meta.url));

describe("React CAD viewer scene", () => {
  it("applies wireframe material to every rendered mesh", async () => {
    vi.resetModules();
    mockPackageDependency("react", () => ({
      default: { memo: <Component,>(component: Component): Component => component },
      memo: <Component,>(component: Component): Component => component,
      useEffect: (): void => undefined,
      useMemo: <Value,>(factory: () => Value): Value => factory(),
    }));

    try {
      const { CadCanvasView } = await import("../packages/react-cad-render/src/viewer/scene.tsx");
      const compiled = previewCompiledModel([previewMesh("left"), previewMesh("right")]);

      expect(meshWireframeProps(CadCanvasView({ compiled, wireframe: false }))).toEqual([false, false]);
      expect(meshWireframeProps(CadCanvasView({ compiled, wireframe: true }))).toEqual([true, true]);
    } finally {
      unmockPackageDependency("react");
      vi.resetModules();
    }
  });
});

function mockPackageDependency(specifier: string, factory: Parameters<typeof vi.doMock>[1]): void {
  vi.doMock(requireFromTest.resolve(specifier, { paths: [reactCadRenderRoot] }), factory);
}

function unmockPackageDependency(specifier: string): void {
  vi.doUnmock(requireFromTest.resolve(specifier, { paths: [reactCadRenderRoot] }));
}

function meshWireframeProps(canvas: ReactNode): unknown[] {
  const bounds = childrenOf(requiredElement(canvas).props.children).find((child) => isReactElement(child) && child.props.fit === true);
  const group = requiredElement(requiredElement(bounds).props.children);

  return childrenOf(group.props.children).map((meshComponent) => {
    const mesh = renderComponent(meshComponent);
    const material = childrenOf(mesh.props.children).find((child) => isReactElement(child) && child.type === "meshStandardMaterial");
    return requiredElement(material).props.wireframe;
  });
}

function renderComponent(node: ReactNode): ReactElement<ElementProps> {
  const element = requiredElement(node);
  if (typeof element.type !== "function") throw new Error("Expected component element.");
  return requiredElement((element.type as (props: ElementProps) => ReactNode)(element.props));
}

function childrenOf(children: ReactNode): ReactNode[] {
  return Array.isArray(children) ? children : [children];
}

function requiredElement(node: ReactNode | undefined): ReactElement<ElementProps> {
  if (!isReactElement(node)) throw new Error("Expected React element.");
  return node;
}

function isReactElement(node: ReactNode | undefined): node is ReactElement<ElementProps> {
  return typeof node === "object" && node !== null && "props" in node && "type" in node;
}

function previewCompiledModel(meshes: CompiledMesh[]): CompiledModel {
  return {
    ok: true,
    errors: [],
    warnings: [],
    bounds: { min: [0, 0, 0], max: [1, 1, 1], size: [1, 1, 1] },
    nodes: [],
    meshes,
    cutoutsApplied: true,
  };
}

function previewMesh(path: string): CompiledMesh {
  return {
    path,
    type: "Mesh",
    vertices: [[0, 0, 0], [1, 0, 0], [0, 1, 0]],
    faces: [[0, 1, 2]],
  };
}
