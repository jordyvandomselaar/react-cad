import { createCadNode } from "./core.js";
export function Box(props) {
    return createCadNode("Box", props);
}
export function Pyramid(props) {
    return createCadNode("Pyramid", props);
}
export function Cylinder(props) {
    return createCadNode("Cylinder", props);
}
export function Sphere(props) {
    return createCadNode("Sphere", props);
}
export function Mesh(props) {
    return createCadNode("Mesh", props);
}
