import { createCadNode } from "./core.js";
import type { CadNode, CommonProps } from "./types.js";

export type CutoutProps = Pick<CommonProps, "children" | "name">;

export function Cutout(props: CutoutProps): CadNode {
  return createCadNode("Cutout", props);
}

