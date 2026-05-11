import { describe, expect, it } from "vitest";
import { compileModelWithCutouts, type CompiledNode } from "@jordyvd/react-cad/geometry";
import { exportBinaryStl } from "@jordyvd/react-cad/export";
import { renderDesign } from "@jordyvd/react-cad/runtime";
import BasicExample from "../examples/basic/design.tsx";

const REQUIRED_TITLE_TEXT = "Hello world";

describe("basic cassette example", () => {
  it("renders as the photo-reference cassette while preserving the Hello world label on the wood panel", async () => {
    const model = renderDesign(BasicExample);
    const compiled = await compileModelWithCutouts(model);
    const nodes = flattenCompiledNodes(compiled.nodes);
    const shell = requiredNamedNode(nodes, "cassette-shell");
    const woodPanel = requiredNamedNode(nodes, "label-panel");
    const tapeWindow = requiredNamedNode(nodes, "tape-window");
    const tapeLabel = requiredNamedNode(nodes, "cassette-tape");
    const topLine = requiredNamedNode(nodes, "top-engraved-line");
    const lowerLine = requiredNamedNode(nodes, "lower-engraved-line");
    const tapeCounter = requiredNamedNode(nodes, "tape-counter");
    const bottomWoodPanel = requiredNamedNode(nodes, "bottom-wood-panel");
    const reelHollows = [requiredNamedNode(nodes, "tape-window-left-reel-hollow"), requiredNamedNode(nodes, "tape-window-right-reel-hollow")];
    const bottomHoles = [requiredNamedNode(nodes, "left-bottom-round-hole"), requiredNamedNode(nodes, "right-bottom-round-hole")];
    const cornerScrews = [requiredNamedNode(nodes, "top-left-corner-screw"), requiredNamedNode(nodes, "bottom-right-corner-screw")];
    const exported = exportBinaryStl(compiled);
    const title = nodes.find((node) => node.type === "Text" && String(node.props.value).includes(REQUIRED_TITLE_TEXT));

    expect(compiled.ok).toBe(true);
    expect(compiled.warnings).toEqual([]);
    expect(exported.byteLength).toBeGreaterThan(84);
    expect(shell.type).toBe("Polygon");
    expect(shell.localBounds.size).toEqual([96, 60, 4]);
    expect(shell.props.color).toBe("#141419");
    expect(woodPanel.type).toBe("Polygon");
    expect(woodPanel.props.color).toBe("#eee6c7");
    expect(tapeWindow.type).toBe("Polygon");
    expect(tapeWindow.props.color).toBe("#101014");
    expect(tapeCounter.props.color).toBe("#eee6c7");
    expect(bottomWoodPanel.props.color).toBe("#eee6c7");
    expect(requiredNamedNode(nodes, "cassette-90").props.color).toBe("#7b4a22");
    expect(tapeLabel.props.color).toBe("#7b4a22");
    expect(requiredNamedNode(nodes, "top-engraved-line").props.color).toBe("#966431");
    expect(title).toBeDefined();
    expect(title?.props.size).toBeLessThan(tapeLabel.props.size as number);
    expect(title?.props.size).toBeGreaterThan(1.2);
    expect(title?.worldBounds.min[1]).toBeGreaterThan(lowerLine.worldBounds.max[1]);
    expect(title?.worldBounds.max[1]).toBeLessThan(topLine.worldBounds.min[1]);
    expect(centerY(title!)).toBeCloseTo((topLine.worldBounds.min[1] + lowerLine.worldBounds.max[1]) / 2, 2);
    expect(title?.worldBounds.max[1]).toBeLessThanOrEqual(woodPanel.worldBounds.max[1]);
    expect(woodPanel.worldBounds.max[1] - topLine.worldBounds.max[1]).toBeCloseTo(topLine.worldBounds.min[1] - lowerLine.worldBounds.max[1], 2);
    expect(lowerLine.worldBounds.min[1] - tapeWindow.worldBounds.max[1]).toBeCloseTo(topLine.worldBounds.min[1] - lowerLine.worldBounds.max[1], 2);
    expect(centerX(tapeLabel)).toBeCloseTo((tapeWindow.worldBounds.max[0] + woodPanel.worldBounds.max[0]) / 2, 2);
    expect(requiredNamedNode(nodes, "shell-left-reel-hollow").type).toBe("Cutout");
    expect(requiredNamedNode(nodes, "label-panel-tape-window-clearance").type).toBe("Cutout");
    expect(requiredNamedNode(nodes, "tape-window-left-reel-hollow").type).toBe("Cutout");
    expect(nodes.some((node) => String(node.props.name).startsWith("label-panel-left-reel-hollow"))).toBe(false);
    expect(nodes.some((node) => String(node.props.name).startsWith("label-panel-right-reel-hollow"))).toBe(false);
    expect(centerX(requiredChildPolygon(requiredNamedNode(nodes, "tape-window-left-reel-hollow")))).toBeCloseTo((tapeWindow.worldBounds.min[0] + tapeCounter.worldBounds.min[0]) / 2, 2);
    expect(centerX(requiredChildPolygon(requiredNamedNode(nodes, "tape-window-right-reel-hollow")))).toBeCloseTo((tapeCounter.worldBounds.max[0] + tapeWindow.worldBounds.max[0]) / 2, 2);
    expect(nodes.some((node) => node.props.name === "left-reel" || node.props.name === "right-reel")).toBe(false);
    expect(nodes.some((node) => String(node.props.name).includes("-inner-tooth-") || String(node.props.name).includes("-ridge-"))).toBe(false);

    for (const hollow of reelHollows) {
      const hollowShape = requiredChildPolygon(hollow);

      expect(hollow.type).toBe("Cutout");
      expect(countInnerNotchVertices(hollowShape.props.points as Array<[number, number]>)).toBe(16);
      expect(hollowShape.worldBounds.size[2]).toBeGreaterThan(tapeWindow.worldBounds.size[2]);
    }

    for (const hole of bottomHoles) {
      expect(hole.props.color).toBe("#050506");
      expect(hole.worldBounds.max[2]).toBeGreaterThan(bottomWoodPanel.worldBounds.max[2]);
    }

    for (const screw of cornerScrews) {
      expect(screw.props.color).toBe("#202026");
      expect(requiredNamedNode(nodes, `${String(screw.props.name)}-slot-a`).props.color).toBe("#595960");
    }
  });
});

function flattenCompiledNodes(nodes: CompiledNode[]): CompiledNode[] {
  return nodes.flatMap((node) => [node, ...flattenCompiledNodes(node.children)]);
}

function requiredNamedNode(nodes: CompiledNode[], name: string): CompiledNode {
  const node = nodes.find((candidate) => candidate.props.name === name);
  if (!node) throw new Error(`Missing compiled node named ${name}`);
  return node;
}

function requiredChildPolygon(node: CompiledNode): CompiledNode {
  const polygon = node.children.find((child) => child.type === "Polygon");
  if (!polygon) throw new Error(`Missing child polygon for ${String(node.props.name)}`);
  return polygon;
}

function centerX(node: CompiledNode): number {
  return (node.worldBounds.min[0] + node.worldBounds.max[0]) / 2;
}

function centerY(node: CompiledNode): number {
  return (node.worldBounds.min[1] + node.worldBounds.max[1]) / 2;
}

function countInnerNotchVertices(points: Array<[number, number]> | undefined): number {
  if (!points) return 0;

  const radii = points.map(([x, y]) => Math.hypot(x, y));
  const outerRadius = Math.max(...radii);
  return radii.filter((radius) => radius < outerRadius - 0.5).length;
}
