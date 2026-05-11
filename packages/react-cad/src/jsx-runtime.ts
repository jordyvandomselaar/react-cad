import type { CadRenderable } from "./types.js";
import { Fragment, jsx as reactJsx, jsxs as reactJsxs } from "react/jsx-runtime";

export { Fragment };

export function jsx(type: unknown, props: unknown, key?: unknown): CadRenderable {
  return reactJsx(type as never, props as never, key as never) as CadRenderable;
}

export function jsxs(type: unknown, props: unknown, key?: unknown): CadRenderable {
  return reactJsxs(type as never, props as never, key as never) as CadRenderable;
}

export namespace JSX {
  export type Element = CadRenderable;
  export interface IntrinsicAttributes {
    key?: string | number;
  }
  export interface ElementChildrenAttribute {
    children: unknown;
  }
  export interface IntrinsicElements {}
}

