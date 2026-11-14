// Renders scripts/ogp/ogp.html to public/ogp.png (1200x630) with the system Google Chrome.
// Run after editing ogp.html: node scripts/ogp/render.mjs
import { chromium } from "@playwright/test";
import { fileURLToPath, pathToFileURL } from "node:url";

const source = fileURLToPath(new URL("./ogp.html", import.meta.url));
const output = fileURLToPath(new URL("../../public/ogp.png", import.meta.url));

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(source).href);
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: output });
await browser.close();
