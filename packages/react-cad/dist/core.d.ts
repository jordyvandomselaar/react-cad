import type { CadNode } from "./types.js";
export type { CadNode } from "./types.js";
export declare function createCadNode(type: string, props?: Record<string, unknown>): CadNode;
export declare function isCadNode(value: unknown): value is CadNode;
export declare function renderDesign(designExport: unknown): CadNode;
export declare function summarizeModel(model: CadNode): Record<string, number>;
export declare function validateModel(model: unknown): {
    ok: boolean;
    errors: string[];
};
