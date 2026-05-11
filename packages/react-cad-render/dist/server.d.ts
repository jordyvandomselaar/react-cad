import { type Server } from "node:http";
import { type CadNode } from "@jordyvd/react-cad/runtime";
import { type ViteDevServer } from "vite";
export declare function runCli(argv: string[]): Promise<void>;
export declare function createReactCadServer({ entrypoint }: {
    entrypoint: string;
}): Promise<Server>;
export declare function loadModel(entrypoint: string, vite?: ViteDevServer): Promise<CadNode>;
