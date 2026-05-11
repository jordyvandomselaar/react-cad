import type { CadNode, CommonProps } from "./types.js";
export type CutoutProps = Pick<CommonProps, "children" | "name">;
export declare function Cutout(props: CutoutProps): CadNode;
