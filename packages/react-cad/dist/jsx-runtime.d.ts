import type { CadRenderable } from "./types.js";
import { Fragment } from "react/jsx-runtime";
export { Fragment };
export declare function jsx(type: unknown, props: unknown, key?: unknown): CadRenderable;
export declare function jsxs(type: unknown, props: unknown, key?: unknown): CadRenderable;
export declare namespace JSX {
    type Element = CadRenderable;
    interface IntrinsicAttributes {
        key?: string | number;
    }
    interface ElementChildrenAttribute {
        children: unknown;
    }
    interface IntrinsicElements {
    }
}
