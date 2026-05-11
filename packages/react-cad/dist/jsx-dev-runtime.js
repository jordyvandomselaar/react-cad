import { Fragment, jsxDEV as reactJsxDEV } from "react/jsx-dev-runtime";
export { Fragment };
export function jsxDEV(type, props, key, isStaticChildren, source, self) {
    return reactJsxDEV(type, props, key, isStaticChildren ?? false, source, self);
}
