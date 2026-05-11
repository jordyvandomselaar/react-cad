import { describe, expect, it } from "vitest";
import { Fragment, jsx, jsxs } from "@jordyvd/react-cad/jsx-runtime";
import { Box, Cylinder, Mesh, Pyramid, Sphere } from "@jordyvd/react-cad/3d";
import { Circle, Line, Polygon, Rectangle, Text, Triangle } from "@jordyvd/react-cad/2d";
import { Grid, Horizontal, Stack, Vertical } from "@jordyvd/react-cad/layout";
import { Cutout } from "@jordyvd/react-cad/operations";
import { compileModel, compileModelWithCutouts } from "@jordyvd/react-cad/geometry";
import { exportBinaryStl } from "@jordyvd/react-cad/export";
import { renderDesign, summarizeModel, validateModel } from "@jordyvd/react-cad/runtime";

describe("React CAD evaluation", () => {
  it("resolves custom components and fragments into serializable CAD nodes", () => {
    function Plate() {
      return jsxs(Fragment, {
        children: [
          jsx(Box, { width: 20, height: 4, depth: 10, color: "tomato" }),
          null,
          false,
        ],
      });
    }

    const model = renderDesign(() => jsx(Plate, {}));

    expect(summarizeModel(model)).toEqual({ Box: 1, Scene: 1 });
    expect(JSON.parse(JSON.stringify(model))).toEqual(model);
  });

  it("rejects DOM elements with an actionable path", () => {
    function InvalidDesign() {
      return jsx("div", { children: "nope" });
    }

    expect(() => renderDesign(InvalidDesign)).toThrow(/Unsupported host element <div> at Design\.InvalidDesign/);
  });
});

describe("React CAD validation", () => {
  it.each([
    {
      name: "invalid dimensions",
      model: renderDesign(() => Box({ width: -1, height: 4, depth: 10 })),
      error: /Scene\.Box\[0\]\.width/,
    },
    {
      name: "polygon self-intersection",
      model: renderDesign(() => Polygon({ points: [[0, 0], [10, 10], [0, 10], [10, 0]] })),
      error: /Scene\.Polygon\[0\]\.points/,
    },
    {
      name: "mesh face index",
      model: renderDesign(() => Mesh({ vertices: [[0, 0, 0]], faces: [[0, 1, 2]] })),
      error: /faces\[0\].*vertex index 1/,
    },
    {
      name: "orphan cutout",
      model: renderDesign(() => Cutout({ children: Box({ width: 1, height: 1, depth: 1 }) })),
      error: /<Cutout> must be inside a solid primitive/,
    },
    {
      name: "zero-length line",
      model: renderDesign(() => Line({ from: [0, 0], to: [0, 0], strokeWidth: 1, thickness: 1 })),
      error: /<Line> requires distinct from and to points/,
    },
    {
      name: "text control character",
      model: renderDesign(() => Text({ value: "Hello\n" })),
      error: /Scene\.Text\[0\]\.value: unsupported character\(s\) "\\n"/,
    },
  ])("catches $name with an actionable error", ({ model, error }) => {
    const validation = validateModel(model);
    expect(validation.ok).toBe(false);
    expect(validation.errors.join("\n")).toMatch(error);
  });

  it.each([
    {
      name: "surface rejects repeated vertex triangles",
      mesh: Mesh({ vertices: [[0, 0, 0], [1, 0, 0], [0, 1, 0]], faces: [[0, 1, 1]], validate: "surface" }),
      ok: false,
      error: /three distinct vertices/,
    },
    {
      name: "surface rejects zero-area triangles",
      mesh: Mesh({ vertices: [[0, 0, 0], [1, 0, 0], [2, 0, 0]], faces: [[0, 1, 2]], validate: "surface" }),
      ok: false,
      error: /area must be greater than 0/,
    },
    {
      name: "surface accepts open non-degenerate triangle meshes",
      mesh: Mesh({ vertices: [[0, 0, 0], [1, 0, 0], [0, 1, 0]], faces: [[0, 1, 2]], validate: "surface" }),
      ok: true,
    },
    {
      name: "solid rejects open triangle meshes",
      mesh: Mesh({ vertices: [[0, 0, 0], [1, 0, 0], [0, 1, 0]], faces: [[0, 1, 2]], validate: "solid" }),
      ok: false,
      error: /solid meshes must be watertight/,
    },
    {
      name: "none still rejects unsafe face indices",
      mesh: Mesh({ vertices: [[0, 0, 0], [1, 0, 0], [0, 1, 0]], faces: [[0, 1, 9]], validate: "none" }),
      ok: false,
      error: /vertex index 9 does not exist/,
    },
    {
      name: "none accepts open non-degenerate triangle meshes",
      mesh: Mesh({ vertices: [[0, 0, 0], [1, 0, 0], [0, 1, 0]], faces: [[0, 1, 2]], validate: "none" }),
      ok: true,
    },
  ])("validates mesh mode: $name", ({ mesh, ok, error }) => {
    const validation = validateModel(renderDesign(() => mesh));

    expect(validation.ok).toBe(ok);
    if (error) expect(validation.errors.join("\n")).toMatch(error);
  });
});

describe("React CAD geometry compilation", () => {
  it("generates mesh data for every v0 primitive", () => {
    const primitives = [
      Rectangle({ width: 10, height: 5 }),
      Circle({ radius: 4 }),
      Line({ from: [0, 0], to: [10, 0] }),
      Triangle({ width: 10, height: 5 }),
      Polygon({ points: [[0, 0], [8, 0], [8, 4], [0, 4]] }),
      Text({ value: "o", size: 10, thickness: 1 }),
      Box({ width: 10, height: 5, depth: 3 }),
      Pyramid({ width: 10, height: 5, depth: 3 }),
      Cylinder({ radius: 4, height: 10 }),
      Sphere({ radius: 4 }),
      Mesh({ vertices: [[0, 0, 0], [10, 0, 0], [0, 10, 0], [0, 0, 10]], faces: [[0, 2, 1], [0, 1, 3], [0, 3, 2], [1, 2, 3]] }),
    ];

    const compiled = compileModel(renderDesign(() => primitives));

    expect(compiled.ok).toBe(true);
    expect(compiled.meshes).toHaveLength(primitives.length);
    for (const mesh of compiled.meshes) {
      expect(mesh.vertices.length).toBeGreaterThan(0);
      expect(mesh.faces.length).toBeGreaterThan(0);
    }
  });

  it("supports the printable Basic Latin text contract", () => {
    for (let code = 33; code <= 126; code += 1) {
      const character = String.fromCharCode(code);
      const compiled = compileModel(renderDesign(() => Text({ value: character, size: 1, thickness: 0.2 })));

      expect(compiled.ok, character).toBe(true);
      expect(compiled.meshes[0]?.vertices.length, character).toBeGreaterThan(0);
      expect(compiled.meshes[0]?.faces.length, character).toBeGreaterThan(0);
    }

    const compact = compileModel(renderDesign(() => Text({ value: "AA", size: 1, thickness: 0.2 })));
    const spaced = compileModel(renderDesign(() => Text({ value: "A A", size: 1, thickness: 0.2 })));
    const spaceOnlyModel = renderDesign(() => Text({ value: " ", size: 1, thickness: 0.2 }));
    const spaceOnly = compileModel(spaceOnlyModel);

    expect(validateModel(spaceOnlyModel).ok).toBe(true);
    expect(spaceOnly.ok).toBe(true);
    expect(spaceOnly.nodes[0]?.localBounds.size[0]).toBeGreaterThan(0);
    expect(spaceOnly.meshes).toHaveLength(0);
    expect(spaced.bounds.size[0]).toBeGreaterThan(compact.bounds.size[0]);
  });

  it("resolves parent-relative positioning and generates primitive meshes", () => {
    const model = renderDesign(() => Box({
      width: 100,
      height: 10,
      depth: 20,
      children: Box({
        width: 10,
        height: 2,
        depth: 4,
        position: { x: { from: "right", offset: -20 } },
      }),
    }));

    const compiled = compileModel(model);

    expect(compiled.ok).toBe(true);
    expect(compiled.meshes).toHaveLength(2);
    expect(compiled.nodes[0]?.children[0]?.translation[0]).toBe(25);
    expect(compiled.meshes[0]?.faces).toHaveLength(12);
  });

  it("reports compiled bounds from every positive mesh, including nested raised children", async () => {
    const model = renderDesign(() => Box({
      width: 10,
      height: 10,
      depth: 10,
      children: Box({
        width: 2,
        height: 2,
        depth: 2,
        position: { z: { from: "front", offset: 2 } },
      }),
    }));

    const compiled = await compileModelWithCutouts(model);

    expect(compiled.ok).toBe(true);
    expect(compiled.bounds.min).toEqual([-5, -5, -5]);
    expect(compiled.bounds.max).toEqual([5, 5, 7]);
    expect(compiled.bounds.size).toEqual([10, 10, 12]);
  });

  it("resolves percent offsets and degree rotations in parent space", () => {
    const model = renderDesign(() => Box({
      width: 100,
      height: 20,
      depth: 20,
      children: Box({
        width: 10,
        height: 4,
        depth: 2,
        position: { x: { from: "right", offset: -10, unit: "percent" }, z: "front" },
        rotation: 90,
      }),
    }));

    const compiled = compileModel(model);
    const childBounds = meshBounds(compiled.meshes[1]?.vertices ?? []);

    expect(compiled.ok).toBe(true);
    expect(compiled.nodes[0]?.children[0]?.translation).toEqual([35, 0, 9]);
    expect(childBounds.size).toEqual([4, 10, 2]);
  });

  it("triangulates concave polygon caps without filling the missing profile", () => {
    const points: Array<[number, number]> = [[-10, -10], [10, -10], [10, 10], [4, 10], [4, -4], [-4, -4], [-4, 10], [-10, 10]];
    const compiled = compileModel(renderDesign(() => Polygon({ points, thickness: 2 })));
    const mesh = compiled.meshes[0];
    const topCapFaces = mesh?.faces.slice(0, (points.length - 2) * 2).filter((_, index) => index % 2 === 1) ?? [];
    const capArea = topCapFaces.reduce((total, face) => total + triangleArea2d(mesh?.vertices ?? [], face), 0);

    expect(compiled.ok).toBe(true);
    expect(roundForStl(capArea)).toBe(roundForStl(polygonAreaAbs(points)));
  });

  it("lays out children and excludes cutout helper geometry from positive meshes", () => {
    const model = renderDesign(() => Box({
      width: 80,
      height: 4,
      depth: 20,
      children: [
        Horizontal({
          gap: 5,
          children: [
            Box({ width: 10, height: 2, depth: 2 }),
            Box({ width: 20, height: 2, depth: 2 }),
          ],
        }),
        Cutout({ children: Box({ width: 4, height: 6, depth: 4 }) }),
      ],
    }));

    const compiled = compileModel(model);
    const horizontal = compiled.nodes[0]?.children.find((node) => node.type === "Horizontal");

    expect(compiled.ok).toBe(true);
    expect(compiled.meshes.map((mesh) => mesh.type)).toEqual(["Box", "Box", "Box"]);
    expect(horizontal?.children.map((child) => child.translation[0])).toEqual([-12.5, 7.5]);
  });

  it("lays out vertical, stack, and explicitly-sized grid tracks in model space", () => {
    const model = renderDesign(() => [
      Vertical({
        gap: 5,
        children: [
          Box({ width: 2, height: 10, depth: 2 }),
          Box({ width: 2, height: 20, depth: 2 }),
        ],
      }),
      Stack({
        gap: 3,
        children: [
          Box({ width: 2, height: 2, depth: 4 }),
          Box({ width: 2, height: 2, depth: 6 }),
        ],
      }),
      Grid({
        columns: { count: 2, gap: 2, size: 20 },
        rows: { count: 2, gap: 4, size: 10 },
        children: [
          Box({ width: 2, height: 2, depth: 2 }),
          Box({ width: 2, height: 2, depth: 2 }),
          Box({ width: 2, height: 2, depth: 2 }),
          Box({ width: 2, height: 2, depth: 2 }),
        ],
      }),
    ]);

    const compiled = compileModel(model);
    const boundsByPath = Object.fromEntries(compiled.meshes.map((mesh) => [mesh.path, meshBounds(mesh.vertices)]));

    expect(boundsByPath["Scene.Vertical[0].Box[0]"]?.min[1]).toBe(-17.5);
    expect(boundsByPath["Scene.Vertical[0].Box[1]"]?.max[1]).toBe(17.5);
    expect(boundsByPath["Scene.Stack[1].Box[0]"]?.min[2]).toBe(-6.5);
    expect(boundsByPath["Scene.Stack[1].Box[1]"]?.max[2]).toBe(6.5);
    expect(boundsByPath["Scene.Grid[2].Box[0]"]?.min).toEqual([-12, 6, -1]);
    expect(boundsByPath["Scene.Grid[2].Box[3]"]?.max).toEqual([12, -6, 1]);
  });

  it("applies cylinder cutouts to the nearest solid and exports the final mesh as binary STL", async () => {
    const model = renderDesign(() => Box({
      width: 20,
      height: 10,
      depth: 20,
      children: Cutout({ children: Cylinder({ radius: 3, height: 24 }) }),
    }));

    expect(() => exportBinaryStl(compileModel(model))).toThrow(/unapplied cutouts/);

    const compiled = await compileModelWithCutouts(model);
    const stl = exportBinaryStl(compiled);
    const holeWallVertices = compiled.meshes[0]?.vertices.filter(([x, y, z]) => {
      const isOnCylinderWall = Math.abs(Math.hypot(x, z) - 3) < 0.01;
      const reachesPlateFace = Math.abs(Math.abs(y) - 5) < 0.01;
      return isOnCylinderWall && reachesPlateFace;
    }) ?? [];

    expect(compiled.ok).toBe(true);
    expect(compiled.cutoutsApplied).toBe(true);
    expect(compiled.meshes).toHaveLength(1);
    expect(compiled.meshes[0]?.type).toBe("Box");
    expect(compiled.meshes[0]?.faces.length).toBeGreaterThan(12);
    expect(holeWallVertices.length).toBeGreaterThan(0);
    expect(new DataView(stl.buffer).getUint32(80, true)).toBe(compiled.meshes[0]?.faces.length);
  });

  it("applies multiple positioned cutouts to the same solid", async () => {
    const model = renderDesign(() => Box({
      width: 40,
      height: 8,
      depth: 18,
      children: [
        Cutout({ children: Cylinder({ radius: 2, height: 12, position: { x: -8 } }) }),
        Cutout({ children: Cylinder({ radius: 2, height: 12, position: { x: 8 } }) }),
      ],
    }));

    const beforeCutouts = compileModel(model);
    const compiled = await compileModelWithCutouts(model);
    const holeWallVertices = (centerX: number) => compiled.meshes[0]?.vertices.filter(([x, y, z]) => {
      const isOnCylinderWall = Math.abs(Math.hypot(x - centerX, z) - 2) < 0.01;
      const reachesPlateFace = Math.abs(Math.abs(y) - 4) < 0.01;
      return isOnCylinderWall && reachesPlateFace;
    }) ?? [];

    expect(beforeCutouts.cutoutsApplied).toBe(false);
    expect(compiled.ok).toBe(true);
    expect(compiled.cutoutsApplied).toBe(true);
    expect(holeWallVertices(-8).length).toBeGreaterThan(0);
    expect(holeWallVertices(8).length).toBeGreaterThan(0);
  });

  it("warns when a cutout misses despite overlapping target bounds", async () => {
    const model = renderDesign(() => Box({
      width: 10,
      height: 10,
      depth: 10,
      children: Cutout({ children: Cylinder({ radius: 1, height: 12, position: { x: 6, z: 6 } }) }),
    }));

    const compiled = await compileModelWithCutouts(model);

    expect(compiled.ok).toBe(true);
    expect(compiled.warnings).toEqual(["Scene.Box[0].Cutout[0].Cylinder[0]: cutout does not intersect target solid Scene.Box[0]."]);
    expect(compiled.meshes[0]?.faces.length).toBe(12);
  });

  it("exports binary STL coordinates in model millimeters", () => {
    const compiled = compileModel(renderDesign(() => Box({ width: 20, height: 10, depth: 4 })));
    const stl = exportBinaryStl(compiled);

    expect(stlBounds(stl)).toEqual({
      min: [-10, -5, -2],
      max: [10, 5, 2],
      size: [20, 10, 4],
    });
  });
});

function stlBounds(stl: Uint8Array): { min: [number, number, number]; max: [number, number, number]; size: [number, number, number] } {
  const view = new DataView(stl.buffer, stl.byteOffset, stl.byteLength);
  const triangleCount = view.getUint32(80, true);
  const vertices: Array<[number, number, number]> = [];

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

  return meshBounds(vertices);
}

function meshBounds(vertices: Array<[number, number, number]>): { min: [number, number, number]; max: [number, number, number]; size: [number, number, number] } {
  const min = [
    Math.min(...vertices.map(([x]) => x)),
    Math.min(...vertices.map(([, y]) => y)),
    Math.min(...vertices.map(([, , z]) => z)),
  ].map(roundForStl) as [number, number, number];
  const max = [
    Math.max(...vertices.map(([x]) => x)),
    Math.max(...vertices.map(([, y]) => y)),
    Math.max(...vertices.map(([, , z]) => z)),
  ].map(roundForStl) as [number, number, number];

  return {
    min,
    max,
    size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]].map(roundForStl) as [number, number, number],
  };
}

function triangleArea2d(vertices: Array<[number, number, number]>, face: [number, number, number]): number {
  const [a, b, c] = face.map((index) => vertices[index]);
  if (!a || !b || !c) return 0;
  return Math.abs(((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) / 2);
}

function polygonAreaAbs(points: Array<[number, number]>): number {
  let area = 0;
  for (let index = 0; index < points.length; index += 1) {
    const nextIndex = (index + 1) % points.length;
    area += points[index][0] * points[nextIndex][1] - points[nextIndex][0] * points[index][1];
  }
  return Math.abs(area / 2);
}

function roundForStl(value: number): number {
  return Math.round(value * 1000) / 1000;
}
