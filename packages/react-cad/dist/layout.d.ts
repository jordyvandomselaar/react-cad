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
export declare function Horizontal(props: LayoutProps): CadNode;
export declare function Vertical(props: LayoutProps): CadNode;
export declare function Stack(props: LayoutProps): CadNode;
export declare function Grid(props: GridProps): CadNode;
