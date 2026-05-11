import { createCadNode } from "./core.js";
import type { CadNode, CommonProps } from "./types.js";

export type BoxProps = CommonProps & {
  width: number;
  height: number;
  depth: number;
};

export type PyramidProps = CommonProps & {
  width: number;
  height: number;
  depth: number;
};

export type CylinderProps = CommonProps & {
  radius: number;
  height: number;
  segments?: number;
};

export type SphereProps = CommonProps & {
  radius: number;
  segments?: number;
};

export type MeshProps = CommonProps & {
  vertices: Array<[number, number, number]>;
  faces: Array<[number, number, number]>;
  validate?: "none" | "surface" | "solid";
  smooth?: boolean;
};

export function Box(props: BoxProps): CadNode {
  return createCadNode("Box", props);
}

export function Pyramid(props: PyramidProps): CadNode {
  return createCadNode("Pyramid", props);
}

export function Cylinder(props: CylinderProps): CadNode {
  return createCadNode("Cylinder", props);
}

export function Sphere(props: SphereProps): CadNode {
  return createCadNode("Sphere", props);
}

export function Mesh(props: MeshProps): CadNode {
  return createCadNode("Mesh", props);
}

