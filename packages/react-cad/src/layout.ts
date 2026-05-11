import { createCadNode } from "./core.js";
import type { Align, CadNode, CommonProps } from "./types.js";

export type LayoutProps = CommonProps & {
  gap?: number;
  align?: Align;
};

export type GridAxisConfig = {
  count?: number;
  gap?: number;
  size?: number | "auto";
};

export type GridProps = CommonProps & {
  columns: GridAxisConfig;
  rows?: GridAxisConfig;
  align?: Align;
};

export function Horizontal(props: LayoutProps): CadNode {
  return createCadNode("Horizontal", props);
}

export function Vertical(props: LayoutProps): CadNode {
  return createCadNode("Vertical", props);
}

export function Stack(props: LayoutProps): CadNode {
  return createCadNode("Stack", props);
}

export function Grid(props: GridProps): CadNode {
  return createCadNode("Grid", props);
}

