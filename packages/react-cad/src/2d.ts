import { createCadNode } from "./core.js";
import type { CadNode, CommonProps } from "./types.js";

export type RectangleProps = CommonProps & {
  width: number;
  height: number;
  thickness?: number;
};

export type CircleProps = CommonProps & {
  radius: number;
  thickness?: number;
  segments?: number;
};

export type LineProps = CommonProps & {
  from: [number, number];
  to: [number, number];
  strokeWidth?: number;
  thickness?: number;
};

export type TriangleProps = CommonProps & {
  width: number;
  height: number;
  thickness?: number;
};

export type PolygonProps = CommonProps & {
  points: Array<[number, number]>;
  thickness?: number;
};

export type TextProps = Omit<CommonProps, "children"> & {
  value: string;
  size?: number;
  thickness?: number;
};

export function Rectangle(props: RectangleProps): CadNode {
  return createCadNode("Rectangle", props);
}

export function Circle(props: CircleProps): CadNode {
  return createCadNode("Circle", props);
}

export function Line(props: LineProps): CadNode {
  return createCadNode("Line", props);
}

export function Triangle(props: TriangleProps): CadNode {
  return createCadNode("Triangle", props);
}

export function Polygon(props: PolygonProps): CadNode {
  return createCadNode("Polygon", props);
}

export function Text(props: TextProps): CadNode {
  return createCadNode("Text", props);
}

