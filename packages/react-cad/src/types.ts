import type { ReactNode } from "react";

export type Unit = "mm" | "percent";

export type XPosition =
  | number
  | "left"
  | "center"
  | "right"
  | { from: "left" | "center" | "right"; offset?: number; unit?: Unit };

export type YPosition =
  | number
  | "bottom"
  | "center"
  | "top"
  | { from: "bottom" | "center" | "top"; offset?: number; unit?: Unit };

export type ZPosition =
  | number
  | "back"
  | "center"
  | "front"
  | { from: "back" | "center" | "front"; offset?: number; unit?: Unit };

export type Position =
  | "center"
  | {
      x?: XPosition;
      y?: YPosition;
      z?: ZPosition;
    };

export type Rotation = number | { x?: number; y?: number; z?: number };

export type CadNode = {
  marker: "react-cad.node";
  type: string;
  props: Record<string, unknown>;
  children: unknown[];
};

export type CadRenderable = CadNode | ReactNode;

export type CadComponent<Props = Record<string, never>> = (props: Props) => CadRenderable;

export type CommonProps = {
  key?: string | number;
  position?: Position;
  rotation?: Rotation;
  color?: string;
  name?: string;
  children?: CadRenderable | CadRenderable[];
};

export type Align = "start" | "center" | "end";

