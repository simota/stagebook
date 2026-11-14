// Renders public/favicon.svg to the PNG icons next to it, with the system Google Chrome.
// Run after editing favicon.svg: node scripts/icons/render.mjs
import { chromium } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const publicDir = (name) => fileURLToPath(new URL(`../../public/${name}`, import.meta.url));
const svg = await readFile(publicDir("favicon.svg"), "utf8");
// iOS rounds the corners of a touch icon itself, so that one is drawn full-bleed (square corners).
const square = svg.replace(/ rx="[^"]*"/, "");
const targets = [
  { name: "favicon-32.png", size: 32, svg },
  { name: "apple-touch-icon.png", size: 180, svg: square },
];

const browser = await chromium.launch({ channel: "chrome" });
for (const t of targets) {
  const page = await browser.newPage({ viewport: { width: t.size, height: t.size }, deviceScaleFactor: 1 });
  const body = t.svg.replace("<svg ", `<svg width="${t.size}" height="${t.size}" `);
  await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block}</style>${body}`);
  await page.screenshot({ path: publicDir(t.name), omitBackground: true });
  await page.close();
}
await browser.close();
