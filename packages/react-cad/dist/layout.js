import { createCadNode } from "./core.js";
export function Horizontal(props) {
    return createCadNode("Horizontal", props);
}
export function Vertical(props) {
    return createCadNode("Vertical", props);
}
export function Stack(props) {
    return createCadNode("Stack", props);
}
export function Grid(props) {
    return createCadNode("Grid", props);
}
