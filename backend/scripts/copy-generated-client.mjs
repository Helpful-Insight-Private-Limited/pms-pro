import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(backendRoot, "src/generated");
const target = resolve(backendRoot, "dist/src/generated");

if (!existsSync(source)) {
  console.error("Generated Prisma client was not found. Run `npm --workspace backend run prisma:generate` first.");
  process.exit(1);
}

rmSync(target, { recursive: true, force: true });
mkdirSync(dirname(target), { recursive: true });
cpSync(source, target, { recursive: true });

console.log("Copied generated Prisma client to dist/src/generated.");
