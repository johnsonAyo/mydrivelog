import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const skipped = new Set([".git", ".next", "node_modules", "dist", "coverage"]);
const files = [];

function walk(directory) {
  for (const name of readdirSync(directory)) {
    if (skipped.has(name)) continue;
    const path = join(directory, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.(tsx|jsx)$/.test(name)) files.push(path);
  }
}

walk(join(root, "packages/ui/src"));
walk(join(root, "src/app"));
const violations = [];

for (const file of files) {
  const path = relative(root, file);
  if (path === "src/app/page.tsx" || path === "src/app/layout.tsx") continue;
  const source = readFileSync(file, "utf8");
  if (path.startsWith("src/app/api/")) continue;
  for (const [index, line] of source.split("\n").entries()) {
    if (/\bclassName\s*=|\bstyle\s*=/.test(line)) violations.push(`${path}:${index + 1}: use component props, not classes or inline styles`);
    if (/#[0-9a-fA-F]{3,8}\b|\b(?:rgb|hsl)a?\(/.test(line)) violations.push(`${path}:${index + 1}: raw colour belongs in tokens.css`);
  }
}

if (violations.length) {
  console.error(violations.join("\n"));
  process.exit(1);
}
console.log(`Product style boundary: ${files.length} components and routes checked`);
