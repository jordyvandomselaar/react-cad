import { isCadNode, validateModel } from "./core.js";
import { textGlyph } from "./text.js";
import initManifold from "manifold-3d";
const IDENTITY_MATRIX = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
];
const EMPTY_BOUNDS = boundsFromMinMax([0, 0, 0], [0, 0, 0]);
const TEXT_GLYPH_COLUMNS = 5;
const TEXT_GLYPH_ROWS = 7;
const TEXT_SPACE_COLUMNS = 3;
const TEXT_GLYPH_GAP_COLUMNS = 1;
let manifoldModulePromise;
async function getManifoldModule() {
    manifoldModulePromise ??= initManifold().then((module) => {
        module.setup();
        return module;
    });
    return manifoldModulePromise;
}
export function compileModel(model) {
    return compileModelBase(model).model;
}
export async function compileModelWithCutouts(model) {
    const compiled = compileModelBase(model);
    if (!compiled.model.ok || compiled.cutoutMeshes.length === 0)
        return compiled.model;
    try {
        const { meshes, warnings } = await applyCutouts(compiled.model.meshes, compiled.cutoutMeshes);
        return {
            ...compiled.model,
            warnings: [...compiled.model.warnings, ...warnings],
            meshes,
            bounds: boundsFromMeshes(meshes),
            cutoutsApplied: true,
        };
    }
    catch (error) {
        return {
            ...compiled.model,
            ok: false,
            errors: [...compiled.model.errors, error instanceof Error ? error.message : String(error)],
        };
    }
}
function compileModelBase(model) {
    const validation = validateModel(model);
    if (!validation.ok) {
        return {
            model: {
                ok: false,
                errors: validation.errors,
                warnings: [],
                bounds: EMPTY_BOUNDS,
                nodes: [],
                meshes: [],
                cutoutsApplied: true,
            },
            cutoutMeshes: [],
        };
    }
    const context = { meshes: [], cutoutMeshes: [] };
    const nodes = (model.children ?? []).filter(isCadNode).map((child, index) => {
        return resolveNode(measureNode(child), context, {
            parentMatrix: IDENTITY_MATRIX,
            path: `Scene.${child.type}[${index}]`,
            collectMode: "positive",
            solidAncestorPath: undefined,
        });
    });
    return {
        model: {
            ok: true,
            errors: [],
            warnings: [],
            bounds: boundsFromMeshes(context.meshes),
            nodes,
            meshes: context.meshes,
            cutoutsApplied: context.cutoutMeshes.length === 0,
        },
        cutoutMeshes: context.cutoutMeshes,
    };
}
function boundsFromMeshes(meshes) {
    return unionBounds(meshes.map((mesh) => boundsFromPoints(mesh.vertices))) ?? EMPTY_BOUNDS;
}
async function applyCutouts(meshes, cutoutMeshes) {
    const manifold = await getManifoldModule();
    const cutoutsByTarget = new Map();
    const warnings = [];
    for (const cutoutMesh of cutoutMeshes) {
        const targetCutouts = cutoutsByTarget.get(cutoutMesh.targetPath) ?? [];
        targetCutouts.push(cutoutMesh);
        cutoutsByTarget.set(cutoutMesh.targetPath, targetCutouts);
    }
    const compiledMeshes = meshes.map((mesh) => {
        const targetCutouts = cutoutsByTarget.get(mesh.path) ?? [];
        if (targetCutouts.length === 0)
            return mesh;
        return withTrackedManifolds((track) => {
            let solid = track(meshToManifold(manifold, mesh));
            for (const cutout of targetCutouts) {
                const cutoutSolid = track(meshToManifold(manifold, cutout));
                const intersection = track(solid.intersect(cutoutSolid));
                if (intersection.isEmpty() || Math.abs(intersection.volume()) < 1e-6) {
                    warnings.push(`${cutout.path}: cutout does not intersect target solid ${cutout.targetPath}.`);
                    continue;
                }
                solid = track(solid.subtract(cutoutSolid));
            }
            if (solid.isEmpty()) {
                throw new Error(`${mesh.path}: cutouts removed the entire solid.`);
            }
            return manifoldToCompiledMesh(solid, mesh);
        });
    });
    return { meshes: compiledMeshes, warnings };
}
function withTrackedManifolds(work) {
    const instances = [];
    const track = (instance) => {
        instances.push(instance);
        return instance;
    };
    try {
        return work(track);
    }
    finally {
        for (const instance of instances.reverse()) {
            instance.delete();
        }
    }
}
function meshToManifold(manifold, mesh) {
    return new manifold.Manifold(new manifold.Mesh({
        numProp: 3,
        vertProperties: new Float32Array(mesh.vertices.flat()),
        triVerts: new Uint32Array(mesh.faces.flat()),
    }));
}
function manifoldToCompiledMesh(manifold, source) {
    const output = manifold.getMesh();
    const vertices = [];
    for (let vertexIndex = 0; vertexIndex < output.vertProperties.length; vertexIndex += output.numProp) {
        vertices.push([
            output.vertProperties[vertexIndex],
            output.vertProperties[vertexIndex + 1],
            output.vertProperties[vertexIndex + 2],
        ]);
    }
    const faces = [];
    for (let faceIndex = 0; faceIndex < output.triVerts.length; faceIndex += 3) {
        faces.push([
            output.triVerts[faceIndex],
            output.triVerts[faceIndex + 1],
            output.triVerts[faceIndex + 2],
        ]);
    }
    return {
        ...source,
        vertices,
        faces,
    };
}
function measureNode(node) {
    if (isLayoutNode(node.type)) {
        return measureLayoutNode(node);
    }
    if (node.type === "Cutout") {
        const measuredChildren = node.children.filter(isCadNode).map(measureNode);
        return {
            node,
            localBounds: unionBounds(measuredChildren.map((child) => child.localBounds)) ?? EMPTY_BOUNDS,
        };
    }
    return {
        node,
        localBounds: primitiveLocalBounds(node),
    };
}
function measureLayoutNode(node) {
    const measuredChildren = node.children.filter(isCadNode).map(measureNode);
    const gap = numberProp(node, "gap") ?? 0;
    if (node.type === "Grid") {
        const layoutChildren = layoutGridChildren(node, measuredChildren);
        return {
            node,
            localBounds: unionPlacedBounds(layoutChildren) ?? EMPTY_BOUNDS,
            layoutChildren,
        };
    }
    const axis = node.type === "Horizontal" ? 0 : node.type === "Vertical" ? 1 : 2;
    const align = stringProp(node, "align") ?? "center";
    const totalAxisSize = measuredChildren.reduce((total, child) => total + child.localBounds.size[axis], 0) + Math.max(0, measuredChildren.length - 1) * gap;
    let cursor = -totalAxisSize / 2;
    const layoutChildren = measuredChildren.map((measured) => {
        const translation = [0, 0, 0];
        translation[axis] = cursor - measured.localBounds.min[axis];
        cursor += measured.localBounds.size[axis] + gap;
        for (const crossAxis of [0, 1, 2]) {
            if (crossAxis === axis)
                continue;
            translation[crossAxis] = alignedOffset(measured.localBounds, crossAxis, align);
        }
        return { node: measured.node, measured, translation };
    });
    return {
        node,
        localBounds: unionPlacedBounds(layoutChildren) ?? EMPTY_BOUNDS,
        layoutChildren,
    };
}
function layoutGridChildren(node, measuredChildren) {
    const columnsConfig = objectProp(node, "columns");
    const rowsConfig = objectProp(node, "rows");
    const columnCount = numberFromObject(columnsConfig, "count") ?? Math.ceil(measuredChildren.length / (numberFromObject(rowsConfig, "count") ?? 1));
    const columnGap = numberFromObject(columnsConfig, "gap") ?? 0;
    const rowGap = numberFromObject(rowsConfig, "gap") ?? columnGap;
    const explicitColumnSize = sizeFromObject(columnsConfig);
    const explicitRowSize = sizeFromObject(rowsConfig);
    const align = stringProp(node, "align") ?? "center";
    const columnWidths = Array.from({ length: columnCount }, (_, column) => {
        if (explicitColumnSize !== undefined)
            return explicitColumnSize;
        return Math.max(0, ...measuredChildren.filter((_, index) => index % columnCount === column).map((child) => child.localBounds.size[0]));
    });
    const rowCount = numberFromObject(rowsConfig, "count") ?? Math.ceil(measuredChildren.length / columnCount);
    const rowHeights = Array.from({ length: rowCount }, (_, row) => {
        if (explicitRowSize !== undefined)
            return explicitRowSize;
        return Math.max(0, ...measuredChildren.filter((_, index) => Math.floor(index / columnCount) === row).map((child) => child.localBounds.size[1]));
    });
    const totalWidth = columnWidths.reduce((sum, width) => sum + width, 0) + Math.max(0, columnWidths.length - 1) * columnGap;
    const totalHeight = rowHeights.reduce((sum, height) => sum + height, 0) + Math.max(0, rowHeights.length - 1) * rowGap;
    return measuredChildren.map((measured, index) => {
        const column = index % columnCount;
        const row = Math.floor(index / columnCount);
        const xStart = -totalWidth / 2 + columnWidths.slice(0, column).reduce((sum, width) => sum + width, 0) + column * columnGap;
        const yStart = totalHeight / 2 - rowHeights.slice(0, row).reduce((sum, height) => sum + height, 0) - row * rowGap;
        const translation = [
            xStart + alignedWithinTrack(measured.localBounds, columnWidths[column] ?? 0, 0, align),
            yStart - alignedWithinTrack(measured.localBounds, rowHeights[row] ?? 0, 1, align),
            alignedOffset(measured.localBounds, 2, align),
        ];
        return { node: measured.node, measured, translation };
    });
}
function resolveNode(measured, context, options) {
    const node = measured.node;
    const translation = options.translationOverride ?? resolvePosition(propValue(node, "position"), measured.localBounds, options.parentBounds);
    const rotation = resolveRotation(propValue(node, "rotation"));
    const worldMatrix = multiplyMatrices(options.parentMatrix, multiplyMatrices(translationMatrix(translation), rotationMatrix(rotation)));
    const worldBounds = transformBounds(measured.localBounds, worldMatrix);
    const childParentBounds = measured.localBounds;
    if (options.collectMode !== "none" && isPrimitiveNode(node.type)) {
        const localMesh = generatePrimitiveMesh(node);
        if (localMesh) {
            const mesh = {
                path: options.path,
                type: node.type,
                color: stringProp(node, "color"),
                vertices: localMesh.vertices.map((vertex) => transformPoint(vertex, worldMatrix)),
                faces: localMesh.faces,
            };
            if (options.collectMode === "cutout") {
                if (options.solidAncestorPath) {
                    context.cutoutMeshes.push({ ...mesh, targetPath: options.solidAncestorPath });
                }
            }
            else {
                context.meshes.push(mesh);
            }
        }
    }
    const children = resolveChildrenForNode(measured, context, {
        parentBounds: childParentBounds,
        parentMatrix: worldMatrix,
        path: options.path,
        collectMode: options.collectMode,
        solidAncestorPath: isPrimitiveNode(node.type) ? options.path : options.solidAncestorPath,
    });
    return {
        path: options.path,
        type: node.type,
        props: node.props,
        localBounds: measured.localBounds,
        worldBounds,
        translation,
        rotation,
        children,
    };
}
function resolveChildrenForNode(measured, context, options) {
    const childCollectMode = measured.node.type === "Cutout" ? "cutout" : options.collectMode;
    if (measured.layoutChildren) {
        return measured.layoutChildren.map((child, index) => resolveNode(child.measured, context, {
            ...options,
            path: `${options.path}.${child.node.type}[${index}]`,
            translationOverride: child.translation,
            collectMode: childCollectMode,
        }));
    }
    return measured.node.children.filter(isCadNode).map((child, index) => {
        if (child.type === "Cutout") {
            return resolveNode(measureNode(child), context, {
                ...options,
                path: `${options.path}.${child.type}[${index}]`,
                collectMode: "cutout",
            });
        }
        return resolveNode(measureNode(child), context, {
            ...options,
            path: `${options.path}.${child.type}[${index}]`,
            collectMode: childCollectMode,
        });
    });
}
function primitiveLocalBounds(node) {
    switch (node.type) {
        case "Rectangle":
            return centeredBounds(numberProp(node, "width") ?? 0, numberProp(node, "height") ?? 0, numberProp(node, "thickness") ?? 1);
        case "Circle":
            return centeredBounds((numberProp(node, "radius") ?? 0) * 2, (numberProp(node, "radius") ?? 0) * 2, numberProp(node, "thickness") ?? 1);
        case "Line":
            return lineBounds(node);
        case "Triangle":
            return centeredBounds(numberProp(node, "width") ?? 0, numberProp(node, "height") ?? 0, numberProp(node, "thickness") ?? 1);
        case "Polygon":
            return extrudedPolygonBounds(node.props.points ?? [], numberProp(node, "thickness") ?? 1);
        case "Text":
            return textBounds(stringProp(node, "value") ?? "", numberProp(node, "size") ?? 10, numberProp(node, "thickness") ?? 1);
        case "Box":
            return centeredBounds(numberProp(node, "width") ?? 0, numberProp(node, "height") ?? 0, numberProp(node, "depth") ?? 0);
        case "Pyramid":
            return centeredBounds(numberProp(node, "width") ?? 0, numberProp(node, "height") ?? 0, numberProp(node, "depth") ?? 0);
        case "Cylinder":
            return centeredBounds((numberProp(node, "radius") ?? 0) * 2, numberProp(node, "height") ?? 0, (numberProp(node, "radius") ?? 0) * 2);
        case "Sphere":
            return centeredBounds((numberProp(node, "radius") ?? 0) * 2, (numberProp(node, "radius") ?? 0) * 2, (numberProp(node, "radius") ?? 0) * 2);
        case "Mesh":
            return boundsFromPoints(node.props.vertices ?? []) ?? EMPTY_BOUNDS;
        default:
            return EMPTY_BOUNDS;
    }
}
function generatePrimitiveMesh(node) {
    switch (node.type) {
        case "Rectangle":
            return extrudePolygon(rectanglePoints(numberProp(node, "width") ?? 0, numberProp(node, "height") ?? 0), numberProp(node, "thickness") ?? 1);
        case "Circle":
            return extrudePolygon(circlePoints(numberProp(node, "radius") ?? 0, numberProp(node, "segments") ?? 32), numberProp(node, "thickness") ?? 1);
        case "Line":
            return lineMesh(node);
        case "Triangle":
            return extrudePolygon(trianglePoints(numberProp(node, "width") ?? 0, numberProp(node, "height") ?? 0), numberProp(node, "thickness") ?? 1);
        case "Polygon":
            return extrudePolygon(node.props.points ?? [], numberProp(node, "thickness") ?? 1);
        case "Text": {
            const mesh = textMesh(stringProp(node, "value") ?? "", numberProp(node, "size") ?? 10, numberProp(node, "thickness") ?? 1);
            return mesh.faces.length > 0 ? mesh : undefined;
        }
        case "Box":
            return boxMesh(numberProp(node, "width") ?? 0, numberProp(node, "height") ?? 0, numberProp(node, "depth") ?? 0);
        case "Pyramid":
            return pyramidMesh(numberProp(node, "width") ?? 0, numberProp(node, "height") ?? 0, numberProp(node, "depth") ?? 0);
        case "Cylinder":
            return cylinderMesh(numberProp(node, "radius") ?? 0, numberProp(node, "height") ?? 0, numberProp(node, "segments") ?? 32);
        case "Sphere":
            return sphereMesh(numberProp(node, "radius") ?? 0, numberProp(node, "segments") ?? 16);
        case "Mesh":
            return {
                vertices: (node.props.vertices ?? []).map(([x, y, z]) => [x, y, z]),
                faces: (node.props.faces ?? []).map(([a, b, c]) => [a, b, c]),
            };
        default:
            return undefined;
    }
}
function resolvePosition(position, childBounds, parentBounds) {
    if (!position || position === "center")
        return [0, 0, 0];
    return [
        resolveAxisPosition(position.x, childBounds, parentBounds, 0, "center"),
        resolveAxisPosition(position.y, childBounds, parentBounds, 1, "center"),
        resolveAxisPosition(position.z, childBounds, parentBounds, 2, "center"),
    ];
}
function resolveAxisPosition(axisPosition, childBounds, parentBounds, axis, defaultFrom) {
    if (axisPosition === undefined)
        return 0;
    if (typeof axisPosition === "number")
        return axisPosition;
    const parent = parentBounds ?? EMPTY_BOUNDS;
    const from = typeof axisPosition === "string" ? axisPosition : axisPosition.from;
    const offset = typeof axisPosition === "string" ? 0 : axisOffset(axisPosition.offset ?? 0, axisPosition.unit, parent.size[axis]);
    const parentRef = axisReference(parent, axis, from || defaultFrom);
    const childRef = axisReference(childBounds, axis, from || defaultFrom);
    return parentRef + offset - childRef;
}
function axisOffset(offset, unit, parentSize) {
    return unit === "percent" ? parentSize * (offset / 100) : offset;
}
function axisReference(bounds, axis, reference) {
    if (reference === "left" || reference === "bottom" || reference === "back")
        return bounds.min[axis];
    if (reference === "right" || reference === "top" || reference === "front")
        return bounds.max[axis];
    return (bounds.min[axis] + bounds.max[axis]) / 2;
}
function resolveRotation(rotation) {
    if (typeof rotation === "number")
        return [0, 0, rotation];
    return [rotation?.x ?? 0, rotation?.y ?? 0, rotation?.z ?? 0];
}
function rectanglePoints(width, height) {
    return [[-width / 2, -height / 2], [width / 2, -height / 2], [width / 2, height / 2], [-width / 2, height / 2]];
}
function trianglePoints(width, height) {
    return [[-width / 2, -height / 2], [width / 2, -height / 2], [0, height / 2]];
}
function circlePoints(radius, segments) {
    return Array.from({ length: segments }, (_, index) => {
        const angle = (Math.PI * 2 * index) / segments;
        return [Math.cos(angle) * radius, Math.sin(angle) * radius];
    });
}
function extrudePolygon(points, thickness) {
    const halfThickness = thickness / 2;
    const vertices = [
        ...points.map(([x, y]) => [x, y, -halfThickness]),
        ...points.map(([x, y]) => [x, y, halfThickness]),
    ];
    const faces = [];
    const count = points.length;
    const capTriangles = triangulatePolygon(points);
    for (const [a, b, c] of capTriangles) {
        faces.push([a, c, b]);
        faces.push([count + a, count + b, count + c]);
    }
    for (let index = 0; index < count; index += 1) {
        const next = (index + 1) % count;
        faces.push([index, next, count + next]);
        faces.push([index, count + next, count + index]);
    }
    return { vertices, faces };
}
function triangulatePolygon(points) {
    if (points.length < 3)
        return [];
    if (points.length === 3) {
        return polygonArea(points) >= 0 ? [[0, 1, 2]] : [[0, 2, 1]];
    }
    const isCounterClockwise = polygonArea(points) > 0;
    const remaining = points.map((_, index) => index);
    const triangles = [];
    let guard = points.length * points.length;
    while (remaining.length > 3 && guard > 0) {
        guard -= 1;
        let clippedEar = false;
        for (let index = 0; index < remaining.length; index += 1) {
            const previous = remaining[(index - 1 + remaining.length) % remaining.length];
            const current = remaining[index];
            const next = remaining[(index + 1) % remaining.length];
            if (!isEar(points, remaining, previous, current, next, isCounterClockwise))
                continue;
            triangles.push(isCounterClockwise ? [previous, current, next] : [previous, next, current]);
            remaining.splice(index, 1);
            clippedEar = true;
            break;
        }
        if (!clippedEar) {
            throw new Error("Polygon could not be triangulated. Check for duplicate or nearly-collinear points.");
        }
    }
    if (remaining.length === 3) {
        const [a, b, c] = remaining;
        triangles.push(isCounterClockwise ? [a, b, c] : [a, c, b]);
    }
    return triangles;
}
function polygonArea(points) {
    let area = 0;
    for (let index = 0; index < points.length; index += 1) {
        const nextIndex = (index + 1) % points.length;
        area += points[index][0] * points[nextIndex][1] - points[nextIndex][0] * points[index][1];
    }
    return area / 2;
}
function isEar(points, polygonIndices, previous, current, next, isCounterClockwise) {
    const turn = triangleSignedArea(points[previous], points[current], points[next]);
    if (isCounterClockwise ? turn <= 1e-9 : turn >= -1e-9)
        return false;
    for (const candidate of polygonIndices) {
        if (candidate === previous || candidate === current || candidate === next)
            continue;
        if (pointInTriangle(points[candidate], points[previous], points[current], points[next]))
            return false;
    }
    return true;
}
function triangleSignedArea(a, b, c) {
    return ((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) / 2;
}
function pointInTriangle(point, a, b, c) {
    const area = Math.abs(triangleSignedArea(a, b, c));
    const areaA = Math.abs(triangleSignedArea(point, b, c));
    const areaB = Math.abs(triangleSignedArea(a, point, c));
    const areaC = Math.abs(triangleSignedArea(a, b, point));
    return areaA > 1e-9 && areaB > 1e-9 && areaC > 1e-9 && Math.abs(area - (areaA + areaB + areaC)) <= 1e-9;
}
function lineMesh(node) {
    const from = node.props.from;
    const to = node.props.to;
    const strokeWidth = numberProp(node, "strokeWidth") ?? 1;
    const thickness = numberProp(node, "thickness") ?? 1;
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const length = Math.hypot(dx, dy);
    const nx = (-dy / length) * (strokeWidth / 2);
    const ny = (dx / length) * (strokeWidth / 2);
    return extrudePolygon([[from[0] + nx, from[1] + ny], [to[0] + nx, to[1] + ny], [to[0] - nx, to[1] - ny], [from[0] - nx, from[1] - ny]], thickness);
}
function textMesh(value, size, thickness) {
    const cellSize = size / TEXT_GLYPH_ROWS;
    const width = textLineWidth(value, cellSize);
    const cells = [];
    let cursorX = -width / 2;
    const topY = size / 2;
    for (const character of value) {
        const columns = textCharacterColumns(character);
        if (character !== " ") {
            const glyph = textGlyph(character);
            if (!glyph)
                throw new Error(`<Text> has no glyph for ${JSON.stringify(character)}. Validate the model before compiling geometry.`);
            for (const [rowIndex, row] of glyph.entries()) {
                for (let columnIndex = 0; columnIndex < row.length; columnIndex += 1) {
                    if (row[columnIndex] !== "1")
                        continue;
                    const x = cursorX + columnIndex * cellSize;
                    const y = topY - rowIndex * cellSize;
                    cells.push({ x, y: y - cellSize });
                }
            }
        }
        cursorX += columns * cellSize + TEXT_GLYPH_GAP_COLUMNS * cellSize;
    }
    return textCellsMesh(cells, cellSize, thickness);
}
function textBounds(value, size, thickness) {
    const cellSize = size / TEXT_GLYPH_ROWS;
    const width = textLineWidth(value, cellSize);
    return centeredBounds(width, size, thickness);
}
function textLineWidth(line, cellSize) {
    if (line.length === 0)
        return 0;
    const columns = [...line].reduce((sum, character) => sum + textCharacterColumns(character), 0);
    return (columns + Math.max(0, line.length - 1) * TEXT_GLYPH_GAP_COLUMNS) * cellSize;
}
function textCharacterColumns(character) {
    return character === " " ? TEXT_SPACE_COLUMNS : TEXT_GLYPH_COLUMNS;
}
function textCellsMesh(cells, cellSize, thickness) {
    const vertices = [];
    const faces = [];
    const vertexIndices = new Map();
    const occupiedCells = new Set(cells.map((cell) => textCellKey(cell.x, cell.y)));
    const halfThickness = thickness / 2;
    const vertexIndex = (vertex) => {
        const key = vertex.map((coordinate) => roundForGeometryKey(coordinate)).join(":");
        const existing = vertexIndices.get(key);
        if (existing !== undefined)
            return existing;
        const nextIndex = vertices.length;
        vertices.push(vertex);
        vertexIndices.set(key, nextIndex);
        return nextIndex;
    };
    const addQuad = (a, b, c, d) => {
        const ai = vertexIndex(a);
        const bi = vertexIndex(b);
        const ci = vertexIndex(c);
        const di = vertexIndex(d);
        faces.push([ai, bi, ci], [ai, ci, di]);
    };
    for (const { x, y } of cells) {
        const x2 = x + cellSize;
        const y2 = y + cellSize;
        const z1 = -halfThickness;
        const z2 = halfThickness;
        addQuad([x, y, z2], [x2, y, z2], [x2, y2, z2], [x, y2, z2]);
        addQuad([x, y, z1], [x, y2, z1], [x2, y2, z1], [x2, y, z1]);
        if (!occupiedCells.has(textCellKey(x - cellSize, y))) {
            addQuad([x, y, z1], [x, y, z2], [x, y2, z2], [x, y2, z1]);
        }
        if (!occupiedCells.has(textCellKey(x + cellSize, y))) {
            addQuad([x2, y, z1], [x2, y2, z1], [x2, y2, z2], [x2, y, z2]);
        }
        if (!occupiedCells.has(textCellKey(x, y - cellSize))) {
            addQuad([x, y, z1], [x2, y, z1], [x2, y, z2], [x, y, z2]);
        }
        if (!occupiedCells.has(textCellKey(x, y + cellSize))) {
            addQuad([x, y2, z1], [x, y2, z2], [x2, y2, z2], [x2, y2, z1]);
        }
    }
    return { vertices, faces };
}
function textCellKey(x, y) {
    return `${roundForGeometryKey(x)}:${roundForGeometryKey(y)}`;
}
function roundForGeometryKey(value) {
    return Math.round(value * 1e9) / 1e9;
}
function boxMesh(width, height, depth) {
    const x = width / 2;
    const y = height / 2;
    const z = depth / 2;
    const vertices = [[-x, -y, -z], [x, -y, -z], [x, y, -z], [-x, y, -z], [-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]];
    const faces = [[0, 2, 1], [0, 3, 2], [4, 5, 6], [4, 6, 7], [0, 1, 5], [0, 5, 4], [3, 6, 2], [3, 7, 6], [1, 2, 6], [1, 6, 5], [0, 4, 7], [0, 7, 3]];
    return { vertices, faces };
}
function pyramidMesh(width, height, depth) {
    const x = width / 2;
    const y = height / 2;
    const z = depth / 2;
    return {
        vertices: [[-x, -y, -z], [x, -y, -z], [x, -y, z], [-x, -y, z], [0, y, 0]],
        faces: [[0, 1, 2], [0, 2, 3], [0, 4, 1], [1, 4, 2], [2, 4, 3], [3, 4, 0]],
    };
}
function cylinderMesh(radius, height, segments) {
    const vertices = [[0, -height / 2, 0], [0, height / 2, 0]];
    for (let index = 0; index < segments; index += 1) {
        const angle = (Math.PI * 2 * index) / segments;
        vertices.push([Math.cos(angle) * radius, -height / 2, Math.sin(angle) * radius]);
        vertices.push([Math.cos(angle) * radius, height / 2, Math.sin(angle) * radius]);
    }
    const faces = [];
    for (let index = 0; index < segments; index += 1) {
        const next = (index + 1) % segments;
        const bottom = 2 + index * 2;
        const top = bottom + 1;
        const nextBottom = 2 + next * 2;
        const nextTop = nextBottom + 1;
        faces.push([0, nextBottom, bottom]);
        faces.push([1, top, nextTop]);
        faces.push([bottom, nextBottom, nextTop]);
        faces.push([bottom, nextTop, top]);
    }
    return { vertices, faces: reverseFaces(faces) };
}
function sphereMesh(radius, segments) {
    const rings = Math.max(4, segments);
    const slices = Math.max(8, segments * 2);
    const vertices = [[0, radius, 0], [0, -radius, 0]];
    for (let ring = 1; ring < rings; ring += 1) {
        const phi = (Math.PI * ring) / rings;
        const y = Math.cos(phi) * radius;
        const ringRadius = Math.sin(phi) * radius;
        for (let slice = 0; slice < slices; slice += 1) {
            const theta = (Math.PI * 2 * slice) / slices;
            vertices.push([Math.cos(theta) * ringRadius, y, Math.sin(theta) * ringRadius]);
        }
    }
    const faces = [];
    const firstRingStart = 2;
    for (let slice = 0; slice < slices; slice += 1) {
        faces.push([0, firstRingStart + slice, firstRingStart + ((slice + 1) % slices)]);
    }
    for (let ring = 0; ring < rings - 2; ring += 1) {
        const currentStart = 2 + ring * slices;
        const nextStart = currentStart + slices;
        for (let slice = 0; slice < slices; slice += 1) {
            const nextSlice = (slice + 1) % slices;
            faces.push([currentStart + slice, nextStart + slice, nextStart + nextSlice]);
            faces.push([currentStart + slice, nextStart + nextSlice, currentStart + nextSlice]);
        }
    }
    const lastRingStart = 2 + (rings - 2) * slices;
    const bottomIndex = 1;
    for (let slice = 0; slice < slices; slice += 1) {
        faces.push([bottomIndex, lastRingStart + ((slice + 1) % slices), lastRingStart + slice]);
    }
    return { vertices, faces: reverseFaces(faces) };
}
function centeredBounds(width, height, depth) {
    return boundsFromMinMax([-width / 2, -height / 2, -depth / 2], [width / 2, height / 2, depth / 2]);
}
function lineBounds(node) {
    const from = node.props.from;
    const to = node.props.to;
    if (!from || !to)
        return EMPTY_BOUNDS;
    const strokeWidth = numberProp(node, "strokeWidth") ?? 1;
    const thickness = numberProp(node, "thickness") ?? 1;
    return boundsFromMinMax([Math.min(from[0], to[0]) - strokeWidth / 2, Math.min(from[1], to[1]) - strokeWidth / 2, -thickness / 2], [Math.max(from[0], to[0]) + strokeWidth / 2, Math.max(from[1], to[1]) + strokeWidth / 2, thickness / 2]);
}
function extrudedPolygonBounds(points, thickness) {
    if (points.length === 0)
        return EMPTY_BOUNDS;
    const xs = points.map(([x]) => x);
    const ys = points.map(([, y]) => y);
    return boundsFromMinMax([Math.min(...xs), Math.min(...ys), -thickness / 2], [Math.max(...xs), Math.max(...ys), thickness / 2]);
}
function unionPlacedBounds(children) {
    return unionBounds(children.map((child) => translateBounds(child.measured.localBounds, child.translation)));
}
function translateBounds(bounds, translation) {
    return boundsFromMinMax([bounds.min[0] + translation[0], bounds.min[1] + translation[1], bounds.min[2] + translation[2]], [bounds.max[0] + translation[0], bounds.max[1] + translation[1], bounds.max[2] + translation[2]]);
}
function transformBounds(bounds, matrix) {
    const corners = [
        [bounds.min[0], bounds.min[1], bounds.min[2]],
        [bounds.max[0], bounds.min[1], bounds.min[2]],
        [bounds.max[0], bounds.max[1], bounds.min[2]],
        [bounds.min[0], bounds.max[1], bounds.min[2]],
        [bounds.min[0], bounds.min[1], bounds.max[2]],
        [bounds.max[0], bounds.min[1], bounds.max[2]],
        [bounds.max[0], bounds.max[1], bounds.max[2]],
        [bounds.min[0], bounds.max[1], bounds.max[2]],
    ];
    return boundsFromPoints(corners.map((point) => transformPoint(point, matrix))) ?? EMPTY_BOUNDS;
}
function boundsFromPoints(points) {
    if (points.length === 0)
        return undefined;
    return boundsFromMinMax([
        Math.min(...points.map(([x]) => x)),
        Math.min(...points.map(([, y]) => y)),
        Math.min(...points.map(([, , z]) => z)),
    ], [
        Math.max(...points.map(([x]) => x)),
        Math.max(...points.map(([, y]) => y)),
        Math.max(...points.map(([, , z]) => z)),
    ]);
}
function unionBounds(boundsList) {
    const bounds = boundsList.filter((entry) => Boolean(entry));
    if (bounds.length === 0)
        return undefined;
    return boundsFromMinMax([
        Math.min(...bounds.map((entry) => entry.min[0])),
        Math.min(...bounds.map((entry) => entry.min[1])),
        Math.min(...bounds.map((entry) => entry.min[2])),
    ], [
        Math.max(...bounds.map((entry) => entry.max[0])),
        Math.max(...bounds.map((entry) => entry.max[1])),
        Math.max(...bounds.map((entry) => entry.max[2])),
    ]);
}
function boundsFromMinMax(min, max) {
    return { min, max, size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]] };
}
function alignedOffset(bounds, axis, align) {
    if (align === "start")
        return -bounds.min[axis];
    if (align === "end")
        return -bounds.max[axis];
    return -(bounds.min[axis] + bounds.max[axis]) / 2;
}
function alignedWithinTrack(bounds, trackSize, axis, align) {
    if (align === "start")
        return -bounds.min[axis];
    if (align === "end")
        return trackSize - bounds.max[axis];
    return trackSize / 2 - (bounds.min[axis] + bounds.max[axis]) / 2;
}
function numberProp(node, prop) {
    const value = node.props[prop];
    return typeof value === "number" ? value : undefined;
}
function stringProp(node, prop) {
    const value = node.props[prop];
    return typeof value === "string" ? value : undefined;
}
function objectProp(node, prop) {
    const value = node.props[prop];
    return value && typeof value === "object" && !Array.isArray(value) ? value : undefined;
}
function propValue(node, prop) {
    return node.props[prop];
}
function numberFromObject(object, prop) {
    const value = object?.[prop];
    return typeof value === "number" ? value : undefined;
}
function sizeFromObject(object) {
    const value = object?.size;
    return typeof value === "number" ? value : undefined;
}
function isLayoutNode(type) {
    return type === "Horizontal" || type === "Vertical" || type === "Stack" || type === "Grid";
}
function isPrimitiveNode(type) {
    return type === "Rectangle" || type === "Circle" || type === "Line" || type === "Triangle" || type === "Polygon" || type === "Text" || type === "Box" || type === "Pyramid" || type === "Cylinder" || type === "Sphere" || type === "Mesh";
}
function translationMatrix([x, y, z]) {
    return [
        1, 0, 0, x,
        0, 1, 0, y,
        0, 0, 1, z,
        0, 0, 0, 1,
    ];
}
function rotationMatrix([xDegrees, yDegrees, zDegrees]) {
    const x = degreesToRadians(xDegrees);
    const y = degreesToRadians(yDegrees);
    const z = degreesToRadians(zDegrees);
    const rx = [1, 0, 0, 0, 0, Math.cos(x), -Math.sin(x), 0, 0, Math.sin(x), Math.cos(x), 0, 0, 0, 0, 1];
    const ry = [Math.cos(y), 0, Math.sin(y), 0, 0, 1, 0, 0, -Math.sin(y), 0, Math.cos(y), 0, 0, 0, 0, 1];
    const rz = [Math.cos(z), -Math.sin(z), 0, 0, Math.sin(z), Math.cos(z), 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    return multiplyMatrices(multiplyMatrices(rz, ry), rx);
}
function multiplyMatrices(left, right) {
    const result = Array.from({ length: 16 }, () => 0);
    for (let row = 0; row < 4; row += 1) {
        for (let column = 0; column < 4; column += 1) {
            result[row * 4 + column] = [0, 1, 2, 3].reduce((sum, index) => sum + left[row * 4 + index] * right[index * 4 + column], 0);
        }
    }
    return result;
}
function transformPoint([x, y, z], matrix) {
    return [
        matrix[0] * x + matrix[1] * y + matrix[2] * z + matrix[3],
        matrix[4] * x + matrix[5] * y + matrix[6] * z + matrix[7],
        matrix[8] * x + matrix[9] * y + matrix[10] * z + matrix[11],
    ];
}
function degreesToRadians(degrees) {
    return (degrees * Math.PI) / 180;
}
function reverseFaces(faces) {
    return faces.map(([a, b, c]) => [a, c, b]);
}
