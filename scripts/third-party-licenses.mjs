// Writes dist/THIRD_PARTY_LICENSES.txt: the license text of every package shipped in the built app (the web fonts
// under the SIL Open Font License, and the libraries in the bundle). Runs after `vite build` (npm run build).
// The list comes from package-lock.json: every installed package that is not a dev dependency, minus type-only ones.
import fs from "node:fs";
import path from "node:path";

const TYPES_ONLY = (name) => name.startsWith("@types/") || name === "csstype";

const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
const shipped = Object.entries(lock.packages)
  .filter(([key, pkg]) => key.startsWith("node_modules/") && !pkg.dev)
  .map(([key, pkg]) => ({ name: key.slice("node_modules/".length), version: pkg.version, license: pkg.license }))
  .filter((p) => !TYPES_ONLY(p.name))
  .sort((a, b) => a.name.localeCompare(b.name));

const sections = shipped.map(({ name, version, license }) => {
  const dir = path.join("node_modules", name);
  const file = fs.readdirSync(dir).find((f) => /^(licen[cs]e|copying)/i.test(f));
  if (!file) throw new Error(`${name}: no license file found; add its license text before shipping it`);
  const text = fs.readFileSync(path.join(dir, file), "utf8").trim();
  return `${"=".repeat(78)}\n${name} ${version} (${license})\n${"=".repeat(78)}\n\n${text}\n`;
});

const header = `Third-party software shipped with this app

The fonts (packages @fontsource*/...) are licensed under the SIL Open Font License 1.1; each section below
names the font's copyright holders. The other packages are the libraries included in the app's JavaScript.

`;
fs.writeFileSync(path.join("dist", "THIRD_PARTY_LICENSES.txt"), header + sections.join("\n"));
console.log(`dist/THIRD_PARTY_LICENSES.txt: ${shipped.length} packages`);
