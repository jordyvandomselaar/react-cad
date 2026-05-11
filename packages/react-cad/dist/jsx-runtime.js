import { Fragment, jsx as reactJsx, jsxs as reactJsxs } from "react/jsx-runtime";
export { Fragment };
export function jsx(type, props, key) {
    return reactJsx(type, props, key);
}
export function jsxs(type, props, key) {
    return reactJsxs(type, props, key);
}
