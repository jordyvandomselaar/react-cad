/** @jsxImportSource react */
import React, { useEffect, useMemo } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Bounds, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { CompiledMesh, CompiledModel } from "@jordyvd/react-cad/geometry";

export type ViewCommand = {
  id: number;
  action: "rotate-left" | "rotate-right" | "rotate-up" | "rotate-down" | "zoom-in" | "zoom-out";
};

const WIREFRAME_COLOR = "#45a9ff";
const DEFAULT_MESH_COLOR = "#60a5fa";

export const CadCanvas = React.memo(CadCanvasView);

export function CadCanvasView({ compiled, viewCommand, wireframe = false }: { compiled: CompiledModel; viewCommand?: ViewCommand; wireframe?: boolean }) {
  const cameraTarget = useMemo(() => modelCenter(compiled), [compiled]);

  return (
    <Canvas camera={{ position: [80, 70, 90], fov: 45 }}>
      <color attach="background" args={["#F6F8FA"]} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[60, 80, 70]} intensity={1.2} />
      <Bounds fit clip observe margin={1.4}>
        <group>
          {compiled.meshes.map((mesh) => <CadMesh key={mesh.path} mesh={mesh} wireframe={wireframe} />)}
        </group>
      </Bounds>
      <KeyboardCameraControls command={viewCommand} target={cameraTarget} />
      <OrbitControls makeDefault enableDamping target={cameraTarget} />
    </Canvas>
  );
}

function KeyboardCameraControls({ command, target }: { command?: ViewCommand; target: [number, number, number] }) {
  const { camera } = useThree();

  useEffect(() => {
    if (!command) return;

    const targetVector = new THREE.Vector3(...target);
    const spherical = new THREE.Spherical().setFromVector3(camera.position.clone().sub(targetVector));
    if (command.action === "rotate-left") spherical.theta -= 0.15;
    if (command.action === "rotate-right") spherical.theta += 0.15;
    if (command.action === "rotate-up") spherical.phi = Math.max(0.1, spherical.phi - 0.15);
    if (command.action === "rotate-down") spherical.phi = Math.min(Math.PI - 0.1, spherical.phi + 0.15);
    if (command.action === "zoom-in") spherical.radius = Math.max(10, spherical.radius * 0.85);
    if (command.action === "zoom-out") spherical.radius = spherical.radius * 1.15;

    camera.position.copy(targetVector).add(new THREE.Vector3().setFromSpherical(spherical));
    camera.lookAt(targetVector);
    camera.updateProjectionMatrix();
  }, [camera, command, target]);

  return null;
}

function CadMesh({ mesh, wireframe }: { mesh: CompiledMesh; wireframe: boolean }) {
  const geometry = useMemo(() => {
    return buildPreviewGeometry(mesh);
  }, [mesh]);
  useEffect(() => {
    return () => geometry.dispose();
  }, [geometry]);

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial
        color={wireframe ? WIREFRAME_COLOR : mesh.color ?? DEFAULT_MESH_COLOR}
        roughness={0.55}
        metalness={0.05}
        side={THREE.DoubleSide}
        wireframe={wireframe}
      />
    </mesh>
  );
}

function modelCenter(compiled: CompiledModel): [number, number, number] {
  return [
    (compiled.bounds.min[0] + compiled.bounds.max[0]) / 2,
    (compiled.bounds.min[1] + compiled.bounds.max[1]) / 2,
    (compiled.bounds.min[2] + compiled.bounds.max[2]) / 2,
  ];
}

const SMOOTH_CREASE_COSINE = Math.cos(THREE.MathUtils.degToRad(35));

export function buildPreviewGeometry(mesh: CompiledMesh): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const faceNormals = mesh.faces.map((face) => faceNormal(mesh, face));
  const faceIndicesByVertex = groupFaceIndicesByVertex(mesh.faces);

  for (let faceIndex = 0; faceIndex < mesh.faces.length; faceIndex += 1) {
    const face = mesh.faces[faceIndex];
    const normal = faceNormals[faceIndex];

    for (const vertexIndex of face) {
      const vertex = mesh.vertices[vertexIndex];
      if (!vertex) continue;

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

function shouldSmoothPreviewNormals(mesh: CompiledMesh): boolean {
  return mesh.type !== "Mesh";
}

function groupFaceIndicesByVertex(faces: CompiledMesh["faces"]): Map<number, number[]> {
  const faceIndicesByVertex = new Map<number, number[]>();

  faces.forEach((face, faceIndex) => {
    face.forEach((vertexIndex) => {
      const faceIndices = faceIndicesByVertex.get(vertexIndex) ?? [];
      faceIndices.push(faceIndex);
      faceIndicesByVertex.set(vertexIndex, faceIndices);
    });
  });

  return faceIndicesByVertex;
}

function faceNormal(mesh: CompiledMesh, [aIndex, bIndex, cIndex]: CompiledMesh["faces"][number]): THREE.Vector3 {
  const a = new THREE.Vector3(...mesh.vertices[aIndex]);
  const b = new THREE.Vector3(...mesh.vertices[bIndex]);
  const c = new THREE.Vector3(...mesh.vertices[cIndex]);
  return b.sub(a).cross(c.sub(a)).normalize();
}

function smoothVertexNormal(faceNormal: THREE.Vector3, connectedFaceIndices: number[], faceNormals: THREE.Vector3[]): THREE.Vector3 {
  const normal = new THREE.Vector3();

  for (const connectedFaceIndex of connectedFaceIndices) {
    const connectedFaceNormal = faceNormals[connectedFaceIndex];
    if (faceNormal.dot(connectedFaceNormal) >= SMOOTH_CREASE_COSINE) {
      normal.add(connectedFaceNormal);
    }
  }

  return normal.lengthSq() > 0 ? normal.normalize() : faceNormal.clone();
}
