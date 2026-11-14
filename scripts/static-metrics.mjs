// Static SQI measurements: import graph, layer direction, hardcoded colors, bundle size.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const SRC = "src";
const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (/\.tsx?$/.test(f) && !/\.test\./.test(f)) files.push(p);
  }
})(SRC);

const resolve = (from, spec) => {
  const base = path.join(path.dirname(from), spec);
  return [".ts", ".tsx"].map((e) => base + e).find((p) => fs.existsSync(p));
};
const graph = Object.fromEntries(files.map((f) => {
  const src = fs.readFileSync(f, "utf8");
  // `import x from "./a"`, `import "./a"` (side effect only) and `import("./a")` are all dependencies.
  const deps = [...src.matchAll(/(?:from|import)\s*\(?\s*"(\.[^"]+)"/g)].map((m) => resolve(f, m[1])).filter(Boolean);
  return [f, deps];
}));

let cycles = 0;
const state = {};
const dfs = (n) => {
  state[n] = 1;
  for (const d of graph[n] ?? []) {
    if (state[d] === 1) cycles++;
    else if (!state[d]) dfs(d);
  }
  state[n] = 2;
};
files.forEach((f) => !state[f] && dfs(f));

const layer = (f) => f.split(path.sep)[1].replace(/\.tsx?$/, "");
const allowed = { model: [], store: ["model"], sheets: ["model"], editor: ["model", "store", "sheets"], App: ["*"], main: ["*"], download: ["model", "store"], share: ["model"], Topbar: ["model", "store", "download", "share"] };
const violations = [];
for (const [f, deps] of Object.entries(graph)) {
  for (const d of deps) {
    const a = layer(f), b = layer(d);
    if (a === b || allowed[a]?.includes("*") || allowed[a]?.includes(b)) continue;
    violations.push(`${f} -> ${d}`);
  }
}
const editorToSheets = Object.entries(graph).flatMap(([f, ds]) => ds.filter((d) => layer(f) === "editor" && layer(d) === "sheets" && !d.includes("StageSvg")).map((d) => `${f} -> ${d}`));
const domInNonUi = files.filter((f) => ["model", "store"].includes(layer(f)) && /document\.|window\./.test(fs.readFileSync(f, "utf8")));

const css = fs.readFileSync("src/app.css", "utf8");
const outsideRoot = css.replace(/:root[^{]*\{[^}]*\}/g, "");
const hardColors = (outsideRoot.match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g) ?? []).length;

let gzip = null;
if (fs.existsSync("dist/assets")) {
  gzip = Object.fromEntries(fs.readdirSync("dist/assets").map((f) => [f.replace(/-[\w-]+\./, "."), zlib.gzipSync(fs.readFileSync(path.join("dist/assets", f))).length]));
}
const loc = Object.fromEntries(files.map((f) => [f, fs.readFileSync(f, "utf8").split("\n").length]));

// --check: the boundaries the code keeps are a gate, not only a measurement (scripts/verify.sh runs it).
if (process.argv.includes("--check")) {
  const broken = [...violations, ...editorToSheets, ...domInNonUi.map((f) => `${f}: DOM API in model/store`)];
  if (cycles) broken.push(`${cycles} import cycle(s)`);
  for (const b of broken) console.error(`boundary: ${b}`);
  if (broken.length) process.exit(1);
}

console.log(JSON.stringify({ modules: files.length, cycles, layerViolations: violations, editorToSheetsNonStage: editorToSheets, domApiInModelOrStore: domInNonUi, hardcodedColorsInAppCss: hardColors, gzipBytes: gzip, largestModules: Object.entries(loc).sort((a, b) => b[1] - a[1]).slice(0, 5) }, null, 2));
