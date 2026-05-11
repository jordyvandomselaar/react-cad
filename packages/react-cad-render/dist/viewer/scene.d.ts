/** @jsxImportSource react */
import React from "react";
import * as THREE from "three";
import type { CompiledMesh, CompiledModel } from "@jordyvd/react-cad/geometry";
export type ViewCommand = {
    id: number;
    action: "rotate-left" | "rotate-right" | "rotate-up" | "rotate-down" | "zoom-in" | "zoom-out";
};
export declare const CadCanvas: React.MemoExoticComponent<typeof CadCanvasView>;
export declare function CadCanvasView({ compiled, viewCommand, wireframe }: {
    compiled: CompiledModel;
    viewCommand?: ViewCommand;
    wireframe?: boolean;
}): import("react/jsx-runtime").JSX.Element;
export declare function buildPreviewGeometry(mesh: CompiledMesh): THREE.BufferGeometry;
