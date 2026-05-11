import type { CadRenderable } from "./types.js";
import { Fragment, jsxDEV as reactJsxDEV } from "react/jsx-dev-runtime";

export { Fragment };

export function jsxDEV(type: unknown, props: unknown, key?: unknown, isStaticChildren?: boolean, source?: unknown, self?: unknown): CadRenderable {
  return reactJsxDEV(type as never, props as never, key as never, isStaticChildren ?? false, source as never, self as never) as CadRenderable;
}

export type { JSX } from "./jsx-runtime.js";

