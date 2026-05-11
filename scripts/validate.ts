import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";

const requiredPaths = [
  "package.json",
  "pnpm-workspace.yaml",
  "packages/react-cad/package.json",
  "packages/react-cad-render/package.json",
  "packages/react-cad-render/tsconfig.json",
  "examples/basic/design.tsx",
  "tickets/status.md",
  "specs/v0-api-spec.md",
];

for (const path of requiredPaths) {
  if (!existsSync(path)) {
    throw new Error(`Missing required scaffold file: ${path}`);
  }
}

await validatePackageBoundary();

await run("pnpm", ["build"]);
await run("pnpm", ["exec", "tsc", "-p", "tests/fixtures/consumer-typecheck/tsconfig.json", "--pretty", "false"]);
await run("node", ["--input-type=module", "-e", "import('@jordyvd/react-cad/3d').then((m)=>console.log(Object.keys(m))).catch((e)=>{console.error(e.code + ': ' + e.message); process.exit(1);})"]);
await run("pnpm", ["typecheck"]);
await run("pnpm", ["test"]);
await run("node", ["packages/react-cad-render/bin/react-cad-render.mjs", "examples/basic/design.tsx", "--smoke"]);
await run("npx", ["--no-install", "@jordyvd/react-cad-render", "design.tsx", "--smoke"], { cwd: "examples/basic" });

console.log("Validation passed.");

async function validatePackageBoundary(): Promise<void> {
  const rendererPackage = JSON.parse(await readFile("packages/react-cad-render/package.json", "utf8")) as { dependencies?: Record<string, string> };
  const reactCadDependency = rendererPackage.dependencies?.["@jordyvd/react-cad"];
  if (!reactCadDependency || reactCadDependency.includes("workspace:")) {
    throw new Error("@jordyvd/react-cad-render must use a publishable @jordyvd/react-cad dependency range.");
  }
}

function run(command: string, args: string[], options: { cwd?: string } = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: options.cwd, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with ${code}`));
    });
  });
}

