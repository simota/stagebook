import AxeBuilder from "@axe-core/playwright";
import { test } from "@playwright/test";
import fs from "node:fs";
import { freshStart } from "./helpers";

/** Collects the SQI measurements (docs/quality/sqi.md). Never fails on values; it records them. */
const TABS = ["基本情報", "メンバー", "セットリスト", "ステージ", "機材・返し", "音響照明", "取り置き", "タイムテーブル", "テキスト"];
const metrics: Record<string, unknown> = {};

test.afterAll(() => {
  fs.mkdirSync("test-results", { recursive: true });
  fs.writeFileSync("test-results/metrics.json", JSON.stringify(metrics, null, 2));
});

test("axe violations per tab (desktop)", async ({ page }) => {
  await freshStart(page);
  const byImpact: Record<string, number> = {};
  const rules: Record<string, number> = {};
  for (const name of TABS) {
    await page.getByRole("tab", { name }).click();
    const r = await new AxeBuilder({ page }).include(".app").analyze();
    for (const v of r.violations) {
      byImpact[v.impact ?? "none"] = (byImpact[v.impact ?? "none"] ?? 0) + v.nodes.length;
      rules[v.id] = (rules[v.id] ?? 0) + v.nodes.length;
    }
  }
  metrics.axeNodesByImpact = byImpact;
  metrics.axeRules = rules;
});

test("desktop screenshots", async ({ page }) => {
  await freshStart(page);
  for (const name of TABS) {
    await page.getByRole("tab", { name }).click();
    await page.screenshot({ path: `test-results/shots/1600-${name}.png` });
  }
});

test("dark scheme axe violations", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await freshStart(page);
  const r = await new AxeBuilder({ page }).include(".app").withRules(["color-contrast"]).analyze();
  metrics.darkContrastNodes = r.violations.reduce((n, v) => n + v.nodes.length, 0);
  metrics.darkBodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
});

test("horizontal overflow at 390px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await freshStart(page);
  const overflow: Record<string, number> = {};
  for (const name of TABS) {
    await page.getByRole("tab", { name }).click();
    overflow[name] = await page.evaluate(() => {
      const ed = document.querySelector(".editor")!;
      return Math.max(document.documentElement.scrollWidth - window.innerWidth, ed.scrollWidth - ed.clientWidth);
    });
    await page.screenshot({ path: `test-results/shots/390-${name}.png`, fullPage: false });
  }
  metrics.overflowPx390 = overflow;
});

test("typing latency in a setlist title (40 chars, median of 3)", async ({ page }) => {
  await freshStart(page);
  const runs: number[] = [];
  for (let i = 0; i < 3; i++) {
    const input = page.locator(".item-row").nth(1).getByLabel("曲名");
    await input.fill("");
    await input.focus();
    const t0 = await page.evaluate(() => performance.now());
    await page.keyboard.type("abcdefghijklmnopqrstuvwxyzabcdefghijklmn");
    await page.waitForFunction(() => (document.activeElement as HTMLInputElement).value.length === 40);
    const t1 = await page.evaluate(() => new Promise<number>((r) => requestAnimationFrame(() => r(performance.now()))));
    runs.push(Math.round(t1 - t0));
  }
  metrics.typing40ms = runs.sort((a, b) => a - b)[1];
});

test("keyboard and feedback affordances", async ({ page }) => {
  await freshStart(page);
  await page.getByRole("tab", { name: "ステージ" }).click();
  metrics.stagePartsFocusable = await page.locator(".stage-canvas svg [tabindex='0']").count();
  metrics.stagePartsTotal = await page.evaluate(() => JSON.parse(localStorage.getItem("setlist:show:" + localStorage.getItem("setlist:last"))!).stageParts.length);

  await page.getByRole("tab", { name: "基本情報" }).click();
  await page.locator(".editor input").first().focus();
  metrics.inputFocusOutline = await page.evaluate(() => {
    const s = getComputedStyle(document.activeElement!);
    return `${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor}`;
  });

  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "JSON書き出し" }).click()]);
  await dl.path();
  metrics.exportFeedback = await page.locator("[role=status], [role=alert]").filter({ hasText: /書き出/ }).count();
  metrics.undoButton = await page.getByRole("button", { name: /元に戻す/ }).count();
  metrics.tabPanelLinked = await page.locator("[role=tabpanel]").count();
});

test("corrupted storage at startup", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("setlist:index", "{broken"));
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.reload();
  metrics.corruptIndexAppRenders = await page.locator(".topbar").count();
  metrics.corruptIndexPageErrors = errors.length;
});

/** The planned scale (docs/plans/architecture.md): a 50-item setlist, 50 stage parts, and 30 other saved shows in the library. */
test("scale: typing latency with 50 items, 50 parts and the library open over 30 shows", async ({ page }) => {
  await freshStart(page);
  await page.evaluate(() => {
    const id = localStorage.getItem("setlist:last")!;
    const base = JSON.parse(localStorage.getItem("setlist:show:" + id)!);
    const song = base.items.find((i: { kind: string }) => i.kind === "song");
    const part = base.stageParts[0];
    const index: { id: string; title: string; updatedAt: number }[] = [];
    for (let s = 0; s < 30; s++) {
      const other = { ...base, id: `scale-${s}`, meta: { ...base.meta, date: `2026-01-${String((s % 28) + 1).padStart(2, "0")}` },
        items: Array.from({ length: 20 }, (_, k) => ({ ...song, id: `s${s}-${k}`, title: `Song ${(s * 7 + k) % 120}` })) };
      localStorage.setItem("setlist:show:" + other.id, JSON.stringify(other));
      index.push({ id: other.id, title: other.id, updatedAt: s });
    }
    const big = { ...base,
      items: Array.from({ length: 50 }, (_, k) => ({ ...song, id: `b-${k}`, title: `Big ${k}` })),
      stageParts: Array.from({ length: 50 }, (_, k) => ({ ...part, id: `bp-${k}`, x: (k * 3) % 160, y: (k * 7) % 44 })),
      inputs: [] };
    localStorage.setItem("setlist:show:" + id, JSON.stringify(big));
    localStorage.setItem("setlist:index", JSON.stringify([{ id, title: "big", updatedAt: 99 }, ...index]));
  });
  await page.reload();
  const type40 = async () => {
    const runs: number[] = [];
    for (let i = 0; i < 3; i++) {
      const input = page.locator(".item-row").nth(1).getByLabel("曲名");
      await input.fill("");
      await input.focus();
      const t0 = await page.evaluate(() => performance.now());
      await page.keyboard.type("abcdefghijklmnopqrstuvwxyzabcdefghijklmn");
      await page.waitForFunction(() => (document.activeElement as HTMLInputElement).value.length === 40);
      const t1 = await page.evaluate(() => new Promise<number>((r) => requestAnimationFrame(() => r(performance.now()))));
      runs.push(Math.round(t1 - t0));
    }
    return runs.sort((a, b) => a - b)[1];
  };
  metrics.scaleTyping40ms = await type40();
  await page.getByRole("button", { name: /曲ライブラリから追加/ }).click();
  metrics.scaleLibrarySongs = await page.locator(".library-list li").count();
  metrics.scaleTyping40msLibraryOpen = await type40();
  await page.getByRole("tab", { name: "ステージ" }).click();
  metrics.scaleStageParts = await page.locator(".stage-canvas svg [tabindex='0']").count();
});
