import type { CompiledModel, CompiledMesh, MeshData } from "./geometry.js";

const STL_HEADER_BYTES = 80;
const BYTES_PER_TRIANGLE = 50;

export function exportBinaryStl(compiledModel: CompiledModel, name = "react-cad-model"): Uint8Array {
  if (!compiledModel.ok) {
    throw new Error(`Cannot export invalid model: ${compiledModel.errors.join("; ")}`);
  }

  if (!compiledModel.cutoutsApplied) {
    throw new Error("Cannot export a model with unapplied cutouts. Compile with compileModelWithCutouts() before exporting STL.");
  }

  const triangleCount = compiledModel.meshes.reduce((count, mesh) => count + mesh.faces.length, 0);
  if (triangleCount === 0) {
    throw new Error("Cannot export an empty model to STL.");
  }

  const buffer = new ArrayBuffer(STL_HEADER_BYTES + 4 + triangleCount * BYTES_PER_TRIANGLE);
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const header = `Created by @jordyvd/react-cad: ${name}`.slice(0, STL_HEADER_BYTES);

  for (let index = 0; index < header.length; index += 1) {
    bytes[index] = header.charCodeAt(index);
  }

  view.setUint32(STL_HEADER_BYTES, triangleCount, true);

  let offset = STL_HEADER_BYTES + 4;
  for (const mesh of compiledModel.meshes) {
    offset = writeMesh(view, mesh, offset);
  }

  return bytes;
}

function writeMesh(view: DataView, mesh: CompiledMesh, initialOffset: number): number {
  let offset = initialOffset;

  for (const [a, b, c] of mesh.faces) {
    const first = mesh.vertices[a];
    const second = mesh.vertices[b];
    const third = mesh.vertices[c];
    const normal = triangleNormal({ vertices: [first, second, third], faces: [[0, 1, 2]] });

    for (const value of [...normal, ...first, ...second, ...third]) {
      view.setFloat32(offset, value, true);
      offset += 4;
    }

    view.setUint16(offset, 0, true);
    offset += 2;
  }

  return offset;
}

function triangleNormal(mesh: MeshData): [number, number, number] {
  const [a, b, c] = mesh.faces[0];
  const first = mesh.vertices[a];
  const second = mesh.vertices[b];
  const third = mesh.vertices[c];
  const ux = second[0] - first[0];
  const uy = second[1] - first[1];
  const uz = second[2] - first[2];
  const vx = third[0] - first[0];
  const vy = third[1] - first[1];
  const vz = third[2] - first[2];
  const normal: [number, number, number] = [
    uy * vz - uz * vy,
    uz * vx - ux * vz,
    ux * vy - uy * vx,
  ];
  const length = Math.hypot(...normal) || 1;
  return [normal[0] / length, normal[1] / length, normal[2] / length];
}
