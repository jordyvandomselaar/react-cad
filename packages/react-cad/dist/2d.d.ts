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
export declare function Rectangle(props: RectangleProps): CadNode;
export declare function Circle(props: CircleProps): CadNode;
export declare function Line(props: LineProps): CadNode;
export declare function Triangle(props: TriangleProps): CadNode;
export declare function Polygon(props: PolygonProps): CadNode;
export declare function Text(props: TextProps): CadNode;
