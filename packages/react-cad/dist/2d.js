import { createCadNode } from "./core.js";
export function Rectangle(props) {
    return createCadNode("Rectangle", props);
}
export function Circle(props) {
    return createCadNode("Circle", props);
}
export function Line(props) {
    return createCadNode("Line", props);
}
export function Triangle(props) {
    return createCadNode("Triangle", props);
}
export function Polygon(props) {
    return createCadNode("Polygon", props);
}
export function Text(props) {
    return createCadNode("Text", props);
}
