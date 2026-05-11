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
export declare function Box(props: BoxProps): CadNode;
export declare function Pyramid(props: PyramidProps): CadNode;
export declare function Cylinder(props: CylinderProps): CadNode;
export declare function Sphere(props: SphereProps): CadNode;
export declare function Mesh(props: MeshProps): CadNode;
