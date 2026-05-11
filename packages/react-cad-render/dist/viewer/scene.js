import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/** @jsxImportSource react */
import React, { useEffect, useMemo } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Bounds, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
const WIREFRAME_COLOR = "#45a9ff";
const DEFAULT_MESH_COLOR = "#60a5fa";
export const CadCanvas = React.memo(CadCanvasView);
export function CadCanvasView({ compiled, viewCommand, wireframe = false }) {
    const cameraTarget = useMemo(() => modelCenter(compiled), [compiled]);
    return (_jsxs(Canvas, { camera: { position: [80, 70, 90], fov: 45 }, children: [_jsx("color", { attach: "background", args: ["#F6F8FA"] }), _jsx("ambientLight", { intensity: 0.7 }), _jsx("directionalLight", { position: [60, 80, 70], intensity: 1.2 }), _jsx(Bounds, { fit: true, clip: true, observe: true, margin: 1.4, children: _jsx("group", { children: compiled.meshes.map((mesh) => _jsx(CadMesh, { mesh: mesh, wireframe: wireframe }, mesh.path)) }) }), _jsx(KeyboardCameraControls, { command: viewCommand, target: cameraTarget }), _jsx(OrbitControls, { makeDefault: true, enableDamping: true, target: cameraTarget })] }));
}
function KeyboardCameraControls({ command, target }) {
    const { camera } = useThree();
    useEffect(() => {
        if (!command)
            return;
        const targetVector = new THREE.Vector3(...target);
        const spherical = new THREE.Spherical().setFromVector3(camera.position.clone().sub(targetVector));
        if (command.action === "rotate-left")
            spherical.theta -= 0.15;
        if (command.action === "rotate-right")
            spherical.theta += 0.15;
        if (command.action === "rotate-up")
            spherical.phi = Math.max(0.1, spherical.phi - 0.15);
        if (command.action === "rotate-down")
            spherical.phi = Math.min(Math.PI - 0.1, spherical.phi + 0.15);
        if (command.action === "zoom-in")
            spherical.radius = Math.max(10, spherical.radius * 0.85);
        if (command.action === "zoom-out")
            spherical.radius = spherical.radius * 1.15;
        camera.position.copy(targetVector).add(new THREE.Vector3().setFromSpherical(spherical));
        camera.lookAt(targetVector);
        camera.updateProjectionMatrix();
    }, [camera, command, target]);
    return null;
}
function CadMesh({ mesh, wireframe }) {
    const geometry = useMemo(() => {
        return buildPreviewGeometry(mesh);
    }, [mesh]);
    useEffect(() => {
        return () => geometry.dispose();
    }, [geometry]);
    return (_jsx("mesh", { geometry: geometry, castShadow: true, receiveShadow: true, children: _jsx("meshStandardMaterial", { color: wireframe ? WIREFRAME_COLOR : mesh.color ?? DEFAULT_MESH_COLOR, roughness: 0.55, metalness: 0.05, side: THREE.DoubleSide, wireframe: wireframe }) }));
}
function modelCenter(compiled) {
    return [
        (compiled.bounds.min[0] + compiled.bounds.max[0]) / 2,
        (compiled.bounds.min[1] + compiled.bounds.max[1]) / 2,
        (compiled.bounds.min[2] + compiled.bounds.max[2]) / 2,
    ];
}
const SMOOTH_CREASE_COSINE = Math.cos(THREE.MathUtils.degToRad(35));
export function buildPreviewGeometry(mesh) {
    const positions = [];
    const normals = [];
    const faceNormals = mesh.faces.map((face) => faceNormal(mesh, face));
    const faceIndicesByVertex = groupFaceIndicesByVertex(mesh.faces);
    for (let faceIndex = 0; faceIndex < mesh.faces.length; faceIndex += 1) {
        const face = mesh.faces[faceIndex];
        const normal = faceNormals[faceIndex];
        for (const vertexIndex of face) {
            const vertex = mesh.vertices[vertexIndex];
            if (!vertex)
                continue;
            const vertexNormal = shouldSmoothPreviewNormals(mesh) ? smoothVertexNormal(normal, faceIndicesByVertex.get(vertexIndex) ?? [], faceNormals) : normal;
            positions.push(...vertex);
            normals.push(vertexNormal.x, vertexNormal.y, vertexNormal.z);
        }
    }
    const bufferGeometry = new THREE.BufferGeometry();
    bufferGeometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    bufferGeometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    return bufferGeometry;
}
function shouldSmoothPreviewNormals(mesh) {
    return mesh.type !== "Mesh";
}
function groupFaceIndicesByVertex(faces) {
    const faceIndicesByVertex = new Map();
    faces.forEach((face, faceIndex) => {
        face.forEach((vertexIndex) => {
            const faceIndices = faceIndicesByVertex.get(vertexIndex) ?? [];
            faceIndices.push(faceIndex);
            faceIndicesByVertex.set(vertexIndex, faceIndices);
        });
    });
    return faceIndicesByVertex;
}
function faceNormal(mesh, [aIndex, bIndex, cIndex]) {
    const a = new THREE.Vector3(...mesh.vertices[aIndex]);
    const b = new THREE.Vector3(...mesh.vertices[bIndex]);
    const c = new THREE.Vector3(...mesh.vertices[cIndex]);
    return b.sub(a).cross(c.sub(a)).normalize();
}
function smoothVertexNormal(faceNormal, connectedFaceIndices, faceNormals) {
    const normal = new THREE.Vector3();
    for (const connectedFaceIndex of connectedFaceIndices) {
        const connectedFaceNormal = faceNormals[connectedFaceIndex];
        if (faceNormal.dot(connectedFaceNormal) >= SMOOTH_CREASE_COSINE) {
            normal.add(connectedFaceNormal);
        }
    }
    return normal.lengthSq() > 0 ? normal.normalize() : faceNormal.clone();
}
