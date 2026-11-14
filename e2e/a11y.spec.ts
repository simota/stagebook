import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { freshStart } from "./helpers";

const TABS = ["基本情報", "メンバー", "セットリスト", "ステージ", "機材・返し", "音響照明", "取り置き", "タイムテーブル", "テキスト"];

for (const colorScheme of ["light", "dark"] as const) {
  test(`no serious or critical axe violations (${colorScheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await freshStart(page);
    for (const name of TABS) {
      await page.getByRole("tab", { name }).click();
      const r = await new AxeBuilder({ page }).include(".app").analyze();
      const bad = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(bad.map((v) => `${name}: ${v.id} ×${v.nodes.length}`)).toEqual([]);
    }
  });
}

test("no serious or critical axe violations with the song library open", async ({ page }) => {
  await freshStart(page);
  await page.getByRole("button", { name: "サンプル" }).click();
  await page.getByRole("tab", { name: "セットリスト" }).click();
  await page.getByRole("button", { name: /曲ライブラリから追加/ }).click();
  await page.locator(".library").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/shots/library.png" });
  const r = await new AxeBuilder({ page }).include(".app").analyze();
  expect(r.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id)).toEqual([]);
});

test("no serious or critical axe violations with print options open", async ({ page }) => {
  await freshStart(page);
  await page.locator(".print-options").getByText("表示する項目").click();
  await page.locator(".print-options").getByLabel("曲番号").uncheck();
  await page.locator(".print-options").getByLabel("連絡先").uncheck();
  await page.screenshot({ path: "test-results/shots/print-options.png" });
  const r = await new AxeBuilder({ page }).include(".app").analyze();
  expect(r.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id)).toEqual([]);
});
