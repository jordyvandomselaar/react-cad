import { z } from "zod";
import { SUPPORTED_TEXT_CHARACTERS_DESCRIPTION, unsupportedTextCharacters } from "./text.js";
const NODE_MARKER = "react-cad.node";
const REACT_ELEMENT_TYPE_NAMES = new Set([
    "Symbol(react.element)",
    "Symbol(react.transitional.element)",
]);
const REACT_FRAGMENT_TYPE = Symbol.for("react.fragment");
const REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref");
const REACT_MEMO_TYPE = Symbol.for("react.memo");
const SOLID_NODE_TYPES = new Set([
    "Rectangle",
    "Circle",
    "Line",
    "Triangle",
    "Polygon",
    "Text",
    "Box",
    "Pyramid",
    "Cylinder",
    "Sphere",
    "Mesh",
]);
const finiteNumber = z.number().finite();
const positiveNumber = finiteNumber.positive();
const nonNegativeNumber = finiteNumber.nonnegative();
const positiveInteger = z.number().int().positive();
const segmentCount = z.number().int().min(3);
const unitSchema = z.enum(["mm", "percent"]);
const xPositionSchema = z.union([
    finiteNumber,
    z.enum(["left", "center", "right"]),
    z.object({ from: z.enum(["left", "center", "right"]), offset: finiteNumber.optional(), unit: unitSchema.optional() }).strict(),
]);
const yPositionSchema = z.union([
    finiteNumber,
    z.enum(["bottom", "center", "top"]),
    z.object({ from: z.enum(["bottom", "center", "top"]), offset: finiteNumber.optional(), unit: unitSchema.optional() }).strict(),
]);
const zPositionSchema = z.union([
    finiteNumber,
    z.enum(["back", "center", "front"]),
    z.object({ from: z.enum(["back", "center", "front"]), offset: finiteNumber.optional(), unit: unitSchema.optional() }).strict(),
]);
const positionSchema = z.union([
    z.literal("center"),
    z.object({ x: xPositionSchema.optional(), y: yPositionSchema.optional(), z: zPositionSchema.optional() }).strict(),
]);
const rotationSchema = z.union([
    finiteNumber,
    z.object({ x: finiteNumber.optional(), y: finiteNumber.optional(), z: finiteNumber.optional() }).strict(),
]);
const commonPropsShape = {
    position: positionSchema.optional(),
    rotation: rotationSchema.optional(),
    color: z.string().optional(),
    name: z.string().optional(),
};
const point2Schema = z.tuple([finiteNumber, finiteNumber]);
const point3Schema = z.tuple([finiteNumber, finiteNumber, finiteNumber]);
const faceSchema = z.tuple([z.number().int().nonnegative(), z.number().int().nonnegative(), z.number().int().nonnegative()]);
const textValueSchema = z.string().min(1).superRefine((value, context) => {
    const unsupportedCharacters = unsupportedTextCharacters(value);
    if (unsupportedCharacters.length > 0) {
        context.addIssue({
            code: "custom",
            message: `unsupported character(s) ${unsupportedCharacters.map((character) => JSON.stringify(character)).join(", ")}; supported characters: ${SUPPORTED_TEXT_CHARACTERS_DESCRIPTION}`,
        });
    }
});
const gridAxisConfigSchema = z.object({
    count: positiveInteger.optional(),
    gap: nonNegativeNumber.optional(),
    size: z.union([positiveNumber, z.literal("auto")]).optional(),
}).strict();
const propSchemas = {
    Scene: z.object({}).strict(),
    Rectangle: z.object({ ...commonPropsShape, width: positiveNumber, height: positiveNumber, thickness: positiveNumber.optional() }).strict(),
    Circle: z.object({ ...commonPropsShape, radius: positiveNumber, thickness: positiveNumber.optional(), segments: segmentCount.optional() }).strict(),
    Line: z.object({ ...commonPropsShape, from: point2Schema, to: point2Schema, strokeWidth: positiveNumber.optional(), thickness: positiveNumber.optional() }).strict(),
    Triangle: z.object({ ...commonPropsShape, width: positiveNumber, height: positiveNumber, thickness: positiveNumber.optional() }).strict(),
    Polygon: z.object({ ...commonPropsShape, points: z.array(point2Schema).min(3), thickness: positiveNumber.optional() }).strict(),
    Text: z.object({ ...commonPropsShape, value: textValueSchema, size: positiveNumber.optional(), thickness: positiveNumber.optional() }).strict(),
    Box: z.object({ ...commonPropsShape, width: positiveNumber, height: positiveNumber, depth: positiveNumber }).strict(),
    Pyramid: z.object({ ...commonPropsShape, width: positiveNumber, height: positiveNumber, depth: positiveNumber }).strict(),
    Cylinder: z.object({ ...commonPropsShape, radius: positiveNumber, height: positiveNumber, segments: segmentCount.optional() }).strict(),
    Sphere: z.object({ ...commonPropsShape, radius: positiveNumber, segments: segmentCount.optional() }).strict(),
    Mesh: z.object({ ...commonPropsShape, vertices: z.array(point3Schema), faces: z.array(faceSchema), validate: z.enum(["none", "surface", "solid"]).optional(), smooth: z.boolean().optional() }).strict(),
    Horizontal: z.object({ ...commonPropsShape, gap: nonNegativeNumber.optional(), align: z.enum(["start", "center", "end"]).optional() }).strict(),
    Vertical: z.object({ ...commonPropsShape, gap: nonNegativeNumber.optional(), align: z.enum(["start", "center", "end"]).optional() }).strict(),
    Stack: z.object({ ...commonPropsShape, gap: nonNegativeNumber.optional(), align: z.enum(["start", "center", "end"]).optional() }).strict(),
    Grid: z.object({ ...commonPropsShape, columns: gridAxisConfigSchema, rows: gridAxisConfigSchema.optional(), align: z.enum(["start", "center", "end"]).optional() }).strict(),
    Cutout: z.object({ name: z.string().optional() }).strict(),
};
export function createCadNode(type, props = {}) {
    const safeProps = props ?? {};
    const { children, ...nodeProps } = safeProps;
    return {
        marker: NODE_MARKER,
        type,
        props: stripUndefined(nodeProps),
        children: toChildList(children),
    };
}
export function isCadNode(value) {
    return Boolean(value && typeof value === "object" && value.marker === NODE_MARKER);
}
export function renderDesign(designExport) {
    const designPath = typeof designExport === "function" ? `Design.${describeComponentName(designExport)}` : "Design";
    const designValue = typeof designExport === "function" ? callComponent(designExport, {}, designPath) : designExport;
    const children = resolveChildren(designValue, designPath);
    return {
        marker: NODE_MARKER,
        type: "Scene",
        props: {},
        children,
    };
}
export function summarizeModel(model) {
    const counts = new Map();
    visitCadNodes(model, (node) => {
        counts.set(node.type, (counts.get(node.type) ?? 0) + 1);
    });
    return Object.fromEntries([...counts.entries()].sort(([left], [right]) => left.localeCompare(right)));
}
export function validateModel(model) {
    const errors = [];
    if (!isCadNode(model) || model.type !== "Scene") {
        errors.push("Design did not evaluate to a React CAD scene.");
        return {
            ok: false,
            errors,
        };
    }
    validateNode(model, { path: "Scene", solidAncestorPath: null, errors });
    return {
        ok: errors.length === 0,
        errors,
    };
}
function validateNode(node, context) {
    if (!isCadNode(node)) {
        context.errors.push(`${context.path}: expected a React CAD node.`);
        return;
    }
    if (typeof node.type !== "string" || node.type.length === 0) {
        context.errors.push(`${context.path}: found CAD node without a valid type.`);
        return;
    }
    if (!propSchemas[node.type]) {
        context.errors.push(`${context.path}: unsupported CAD node type "${node.type}".`);
        return;
    }
    validateProps(node, context.path, context.errors);
    validateNodeSpecificRules(node, context);
    const nextSolidAncestorPath = SOLID_NODE_TYPES.has(node.type) ? context.path : context.solidAncestorPath;
    for (const [index, child] of (node.children ?? []).entries()) {
        const childType = isCadNode(child) ? child.type : describeValue(child);
        validateNode(child, {
            path: `${context.path}.${childType}[${index}]`,
            solidAncestorPath: nextSolidAncestorPath,
            errors: context.errors,
        });
    }
}
function validateProps(node, path, errors) {
    const schema = propSchemas[node.type];
    const result = schema.safeParse(node.props ?? {});
    if (!result.success) {
        for (const issue of result.error.issues) {
            const propPath = issue.path.length > 0 ? `.${issue.path.join(".")}` : "";
            errors.push(`${path}${propPath}: ${issue.message}.`);
        }
    }
}
function validateNodeSpecificRules(node, context) {
    if (node.type === "Cutout" && !context.solidAncestorPath) {
        context.errors.push(`${context.path}: <Cutout> must be inside a solid primitive so there is material to remove.`);
    }
    if (node.type === "Grid") {
        const columnsCount = getNestedProp(node.props, ["columns", "count"]);
        const rowsCount = getNestedProp(node.props, ["rows", "count"]);
        if (columnsCount === undefined && rowsCount === undefined) {
            context.errors.push(`${context.path}: <Grid> requires columns.count or rows.count.`);
        }
    }
    if (node.type === "Line") {
        validateLine(node.props.from, node.props.to, context.path, context.errors);
    }
    if (node.type === "Text" && node.children.length > 0) {
        context.errors.push(`${context.path}: <Text> is leaf-only; use value for visible text.`);
    }
    if (node.type === "Polygon") {
        validatePolygon(node.props.points, context.path, context.errors);
    }
    if (node.type === "Mesh") {
        validateMesh(node.props, context.path, context.errors);
    }
}
function validateLine(from, to, path, errors) {
    if (!isPoint2(from) || !isPoint2(to))
        return;
    if (Math.hypot(to[0] - from[0], to[1] - from[1]) <= Number.EPSILON) {
        errors.push(`${path}: <Line> requires distinct from and to points.`);
    }
}
function validatePolygon(points, path, errors) {
    if (!isPoint2Array(points) || points.length < 3)
        return;
    if (Math.abs(polygonArea(points)) < Number.EPSILON) {
        errors.push(`${path}.points: polygon area must be greater than 0.`);
        return;
    }
    for (let firstIndex = 0; firstIndex < points.length; firstIndex += 1) {
        const firstNext = (firstIndex + 1) % points.length;
        for (let secondIndex = firstIndex + 1; secondIndex < points.length; secondIndex += 1) {
            const secondNext = (secondIndex + 1) % points.length;
            const sharesEndpoint = firstIndex === secondIndex || firstIndex === secondNext || firstNext === secondIndex || firstNext === secondNext;
            if (!sharesEndpoint && segmentsIntersect(points[firstIndex], points[firstNext], points[secondIndex], points[secondNext])) {
                errors.push(`${path}.points: polygon edges ${firstIndex}-${firstNext} and ${secondIndex}-${secondNext} intersect.`);
                return;
            }
        }
    }
}
function validateMesh(props, path, errors) {
    const vertices = props.vertices;
    const faces = props.faces;
    if (!isPoint3Array(vertices) || !isFaceArray(faces))
        return;
    const validationMode = typeof props.validate === "string" ? props.validate : "solid";
    const faceErrorCountBefore = errors.length;
    for (const [faceIndex, face] of faces.entries()) {
        if (new Set(face).size !== 3) {
            errors.push(`${path}.faces[${faceIndex}]: triangle faces must reference three distinct vertices.`);
            continue;
        }
        let hasMissingVertex = false;
        for (const vertexIndex of face) {
            if (vertexIndex >= vertices.length) {
                errors.push(`${path}.faces[${faceIndex}]: vertex index ${vertexIndex} does not exist.`);
                hasMissingVertex = true;
            }
        }
        if (hasMissingVertex)
            continue;
        if (triangleArea3d(vertices[face[0]], vertices[face[1]], vertices[face[2]]) <= Number.EPSILON) {
            errors.push(`${path}.faces[${faceIndex}]: triangle area must be greater than 0.`);
        }
    }
    if (errors.length > faceErrorCountBefore)
        return;
    if (validationMode === "solid" && faces.length > 0) {
        const edgeCounts = new Map();
        for (const face of faces) {
            for (const [from, to] of [[face[0], face[1]], [face[1], face[2]], [face[2], face[0]]]) {
                const key = from < to ? `${from}:${to}` : `${to}:${from}`;
                edgeCounts.set(key, (edgeCounts.get(key) ?? 0) + 1);
            }
        }
        for (const [edge, count] of edgeCounts.entries()) {
            if (count !== 2) {
                errors.push(`${path}.faces: edge ${edge} is used ${count} time(s); solid meshes must be watertight.`);
                return;
            }
        }
    }
}
function triangleArea3d(a, b, c) {
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const cross = [
        ab[1] * ac[2] - ab[2] * ac[1],
        ab[2] * ac[0] - ab[0] * ac[2],
        ab[0] * ac[1] - ab[1] * ac[0],
    ];
    return Math.hypot(cross[0], cross[1], cross[2]) / 2;
}
function polygonArea(points) {
    let area = 0;
    for (let index = 0; index < points.length; index += 1) {
        const nextIndex = (index + 1) % points.length;
        area += points[index][0] * points[nextIndex][1] - points[nextIndex][0] * points[index][1];
    }
    return area / 2;
}
function segmentsIntersect(a, b, c, d) {
    const d1 = direction(c, d, a);
    const d2 = direction(c, d, b);
    const d3 = direction(a, b, c);
    const d4 = direction(a, b, d);
    return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}
function direction(a, b, c) {
    return (c[0] - a[0]) * (b[1] - a[1]) - (b[0] - a[0]) * (c[1] - a[1]);
}
function resolveChildren(children, path) {
    if (children === undefined || children === null || children === false) {
        return [];
    }
    if (Array.isArray(children)) {
        return children.flatMap((child, index) => resolveChildren(child, `${path}[${index}]`));
    }
    if (isCadNode(children)) {
        return [resolveCadNode(children, path)];
    }
    if (isReactElement(children)) {
        return resolveReactElement(children, path);
    }
    throw new Error(`Unsupported React CAD child at ${path}: ${describeValue(children)}.`);
}
function resolveCadNode(node, path) {
    return {
        marker: NODE_MARKER,
        type: node.type,
        props: node.props ?? {},
        children: resolveChildren(node.children ?? [], `${path}.${node.type}`),
    };
}
function resolveReactElement(element, path) {
    const elementType = element.type;
    const typeName = describeElementType(elementType);
    const nextPath = `${path}.${typeName}`;
    if (elementType === REACT_FRAGMENT_TYPE) {
        return resolveChildren(element.props?.children, `${path}.Fragment`);
    }
    if (typeof elementType === "function") {
        const resolved = callComponent(elementType, element.props ?? {}, nextPath);
        return resolveChildren(resolved, nextPath);
    }
    if (isReactMemoType(elementType)) {
        const resolved = callComponent(elementType.type, element.props ?? {}, nextPath);
        return resolveChildren(resolved, nextPath);
    }
    if (isReactForwardRefType(elementType)) {
        const resolved = callComponent((props) => elementType.render(props, null), element.props ?? {}, nextPath);
        return resolveChildren(resolved, nextPath);
    }
    if (typeof elementType === "string") {
        throw new Error(`Unsupported host element <${elementType}> at ${path}. Use React CAD components instead of DOM elements.`);
    }
    throw new Error(`Unsupported React element type at ${path}: ${describeValue(elementType)}.`);
}
function callComponent(component, props, path) {
    try {
        return component(props);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (isUnsupportedHookError(message)) {
            throw new Error(`Error while evaluating ${path}: React CAD v0 evaluates static function components only. React hooks are not supported inside CAD design components.`);
        }
        throw new Error(`Error while evaluating ${path}: ${message}`);
    }
}
function isUnsupportedHookError(message) {
    return message.includes("Invalid hook call")
        || message.includes("React hooks are not supported")
        || message.includes("Cannot read properties of null (reading 'use")
        || message.includes("Cannot read properties of undefined (reading 'use");
}
function toChildList(children) {
    if (children === undefined || children === null || children === false) {
        return [];
    }
    if (Array.isArray(children)) {
        return children.flatMap((child) => toChildList(child));
    }
    return [children];
}
function isReactElement(value) {
    return Boolean(value &&
        typeof value === "object" &&
        "$$typeof" in value &&
        REACT_ELEMENT_TYPE_NAMES.has(String(value.$$typeof)));
}
function isReactMemoType(value) {
    return Boolean(value && typeof value === "object" && value.$$typeof === REACT_MEMO_TYPE && typeof value.type === "function");
}
function isReactForwardRefType(value) {
    return Boolean(value && typeof value === "object" && value.$$typeof === REACT_FORWARD_REF_TYPE && typeof value.render === "function");
}
function visitCadNodes(node, visitor) {
    if (!isCadNode(node))
        return;
    visitor(node);
    for (const child of node.children ?? []) {
        visitCadNodes(child, visitor);
    }
}
function stripUndefined(value) {
    return Object.fromEntries(Object.entries(value).filter(([, entryValue]) => entryValue !== undefined));
}
function describeValue(value) {
    if (typeof value === "string")
        return JSON.stringify(value);
    if (typeof value === "number" || typeof value === "boolean")
        return String(value);
    if (typeof value === "function")
        return `function ${describeComponentName(value)}`;
    if (typeof value === "symbol")
        return String(value);
    return Object.prototype.toString.call(value);
}
function describeElementType(type) {
    if (type === REACT_FRAGMENT_TYPE)
        return "Fragment";
    if (typeof type === "function")
        return describeComponentName(type);
    if (isReactMemoType(type))
        return describeComponentName(type.type);
    if (isReactForwardRefType(type))
        return describeComponentName(type.render);
    if (typeof type === "string")
        return type;
    return describeValue(type);
}
function describeComponentName(component) {
    return getFunctionStringProperty(component, "displayName") ?? (component.name || "AnonymousComponent");
}
function getFunctionStringProperty(component, property) {
    const value = component[property];
    return typeof value === "string" ? value : undefined;
}
function getNestedProp(props, path) {
    let current = props;
    for (const segment of path) {
        if (!current || typeof current !== "object")
            return undefined;
        current = current[segment];
    }
    return current;
}
function isPoint2Array(value) {
    return Array.isArray(value) && value.every(isPoint2);
}
function isPoint2(value) {
    return Array.isArray(value) && value.length === 2 && value.every((entry) => typeof entry === "number");
}
function isPoint3Array(value) {
    return Array.isArray(value) && value.every((point) => Array.isArray(point) && point.length === 3 && point.every((entry) => typeof entry === "number"));
}
function isFaceArray(value) {
    return Array.isArray(value) && value.every((face) => Array.isArray(face) && face.length === 3 && face.every((entry) => Number.isInteger(entry) && entry >= 0));
}
