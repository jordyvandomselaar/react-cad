import type { CadNode } from "./types.js";
type Vec3 = [number, number, number];
type Face = [number, number, number];
export type Bounds = {
    min: Vec3;
    max: Vec3;
    size: Vec3;
};
export type MeshData = {
    vertices: Vec3[];
    faces: Face[];
};
export type CompiledMesh = MeshData & {
    path: string;
    type: string;
    color?: string;
};
export type CompiledNode = {
    path: string;
    type: string;
    props: Record<string, unknown>;
    localBounds: Bounds;
    worldBounds: Bounds;
    translation: Vec3;
    rotation: Vec3;
    children: CompiledNode[];
};
export type CompiledModel = {
    ok: boolean;
    errors: string[];
    warnings: string[];
    bounds: Bounds;
    nodes: CompiledNode[];
    meshes: CompiledMesh[];
    cutoutsApplied: boolean;
};
export declare function compileModel(model: CadNode): CompiledModel;
export declare function compileModelWithCutouts(model: CadNode): Promise<CompiledModel>;
export {};
