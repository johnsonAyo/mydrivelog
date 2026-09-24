import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const allowed = new Set(["src/app/globals.css", "packages/tokens/src/tokens.css"]);
const skipped = new Set([".git", ".next", "node_modules", "dist", "coverage"]);
const found = [];

function walk(directory) {
  for (const name of readdirSync(directory)) {
    if (skipped.has(name)) continue;
    const path = join(directory, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.(css|scss|sass|less)$/i.test(name)) found.push(relative(root, path));
  }
}

walk(root);
const stray = found.filter((file) => !allowed.has(file));
if (stray.length) {
  console.error(`Stray stylesheets: ${stray.join(", ")}`);
  process.exit(1);
}
console.log(`Stylesheet boundary: ${found.length} allowed files`);
