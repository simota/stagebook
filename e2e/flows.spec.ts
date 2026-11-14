import { expect, test } from "@playwright/test";
import { freshStart, savedShow } from "./helpers";

test.beforeEach(async ({ page }) => freshStart(page));

test("adds a song and shows it on the performer sheet", async ({ page }) => {
  await page.getByRole("button", { name: "＋ 曲" }).click();
  await page.locator(".item-row").last().getByLabel("曲名").fill("テスト曲");
  await expect(page.locator(".preview .perf-list").getByText("テスト曲")).toBeVisible();
  await expect(page.locator(".preview .p-row").last().locator(".p-no")).toHaveText("8");
  await page.reload();
  await expect(page.locator(".preview .perf-list").getByText("テスト曲")).toBeVisible();
});

test("performer options change the sheet and persist", async ({ page }) => {
  const options = page.locator(".print-options");
  await options.getByText("表示する項目").click();
  await options.getByLabel("白黒反転（暗いステージ用）").check();
  await options.getByLabel("BPM").uncheck();
  await expect(page.locator(".preview .perf")).toHaveClass(/inverse/);
  await expect(page.locator(".preview .p-bpm").filter({ hasText: "♩" })).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".preview .perf")).toHaveClass(/inverse/);
});

test("drags a stage part and deletes another with the keyboard", async ({ page }) => {
  await page.getByRole("tab", { name: "ステージ" }).click();
  const box = (await page.locator(".stage-canvas svg").boundingBox())!;
  const unit = box.width / 192;
  const at = (x: number, y: number) => [box.x + (x + 16) * unit, box.y + (y + 4) * unit] as const;
  const [px, py] = at(28, 28);
  await page.mouse.move(px, py);
  await page.mouse.down();
  await page.mouse.move(px + 20 * unit, py + 5 * unit, { steps: 8 });
  await page.mouse.up();
  const moved = (await savedShow(page)).stageParts.find((p: { id: string }) => p.id === "p-tanaka");
  expect([moved.x, moved.y]).toEqual([48, 33]);

  const [ax, ay] = at(24, 6);
  await page.mouse.click(ax, ay);
  await expect(page.locator(".part-panel legend")).toContainText("Ba Amp");
  await page.keyboard.press("Delete");
  const show = await savedShow(page);
  expect(show.inputs.some((i: { name: string }) => i.name === "Ba 田中")).toBe(false);
  await expect(page.locator(".ch-row")).toHaveCount(15);
});

test("exports and re-imports JSON, and rejects foreign JSON", async ({ page }, info) => {
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "JSON書き出し" }).click()]);
  const file = info.outputPath("export.json");
  await dl.saveAs(file);
  await page.locator('input[type="file"]').setInputFiles(file);
  await expect(page.locator(".topbar select option")).toHaveCount(2);
  await page.locator('input[type="file"]').setInputFiles({ name: "bad.json", mimeType: "application/json", buffer: Buffer.from('{"hello":1}') });
  await expect(page.getByText("このアプリで書き出した公演データではありません")).toBeVisible();
});

test("applies text and reports bad lines", async ({ page }) => {
  await page.getByRole("tab", { name: "テキスト" }).click();
  const area = page.getByLabel("テキストで編集");
  await area.fill("# MY BAND\n## セットリスト\n1. はじまりの歌 | 150 | D | 3:30\n  照明: 青 / 爽やか / 明 / 速い / 頭で全灯");
  await area.press("Control+Enter");
  await expect(page.locator(".preview .hd .band")).toHaveText("MY BAND");
  await area.fill("# X\n## セットリスト\n1. A\n  照明: 金 / / / /");
  await page.getByRole("button", { name: /フォームに反映/ }).click();
  await expect(page.getByText("4行目")).toBeVisible();
  expect((await savedShow(page)).meta.band).toBe("MY BAND");
});

test("every editor tab renders", async ({ page }) => {
  for (const name of ["基本情報", "メンバー", "セットリスト", "ステージ", "機材・返し", "音響照明", "取り置き", "タイムテーブル", "テキスト"]) {
    await page.getByRole("tab", { name }).click();
    await expect(page.locator(".editor .panel")).toBeVisible();
  }
});

test("undoes a deleted setlist item from the toolbar and redoes it", async ({ page }) => {
  const rows = page.locator(".item-row");
  await expect(rows).toHaveCount(11);
  await rows.nth(1).getByRole("button", { name: /を削除/ }).click();
  await expect(rows).toHaveCount(10);
  await page.getByRole("button", { name: "元に戻す" }).click();
  await expect(rows).toHaveCount(11);
  await expect(rows.nth(1).getByLabel("曲名")).toHaveValue("夜明けのスロープ");
  await page.getByRole("button", { name: "やり直す" }).click();
  await expect(rows).toHaveCount(10);
});

test("moves a stage part with the keyboard only", async ({ page }) => {
  await page.getByRole("tab", { name: "ステージ" }).click();
  const part = page.getByRole("button", { name: /^田中/ });
  await part.focus();
  await expect(page.locator(".part-panel legend")).toContainText("田中");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  const moved = (await savedShow(page)).stageParts.find((p: { id: string }) => p.id === "p-tanaka");
  expect(moved.x).toBe(30);
  await page.keyboard.press("Control+z");
  const back = (await savedShow(page)).stageParts.find((p: { id: string }) => p.id === "p-tanaka");
  expect(back.x).toBe(28);
});

test("switches editor tabs with arrow keys", async ({ page }) => {
  await page.getByRole("tab", { name: "セットリスト" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "ステージ" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tab", { name: "ステージ" })).toBeFocused();
  await expect(page.getByRole("tabpanel")).toContainText("チャンネル表");
});

test("confirms export and a recovered index to the user", async ({ page }) => {
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "JSON書き出し" }).click()]);
  await dl.path();
  await expect(page.locator(".notice[role=status]")).toContainText("書き出しました");
  await page.evaluate(() => localStorage.setItem("setlist:index", "{broken"));
  await page.reload();
  await expect(page.locator(".notice[role=alert]")).toContainText("作り直しました");
  await expect(page.locator(".preview .hd .band")).toHaveText("SAMPLE BAND");
});

test("reports import, duplicate and delete results", async ({ page }, info) => {
  const notice = page.locator(".notice[role=status]");
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "JSON書き出し" }).click()]);
  const file = info.outputPath("show.json");
  await dl.saveAs(file);
  await page.locator('input[type="file"]').setInputFiles(file);
  await expect(notice).toContainText("新しい公演として読み込みました");
  await page.getByRole("button", { name: "複製" }).click();
  await expect(notice).toContainText("複製しました");
  await expect(page.locator(".topbar select option")).toHaveCount(3);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "削除" }).first().click();
  await expect(notice).toContainText("削除しました");
  await expect(page.locator(".topbar select option")).toHaveCount(2);
});

test("a two-channel bass preset adds its part and both channels", async ({ page }) => {
  await page.getByRole("tab", { name: "ステージ" }).click();
  const rows = page.locator(".ch-row");
  const before = await rows.count();
  await page.getByRole("button", { name: "＋ ベースアンプ（ヘッド＋キャビ、DI＋マイク 2ch）" }).click();
  await expect(rows).toHaveCount(before + 2);
  await expect(page.getByLabel(`CH${before + 1} 楽器`)).toHaveValue("Ba DI");
  await expect(page.getByLabel(`CH${before + 2} 楽器`)).toHaveValue("Ba Mic");
  await expect(rows.nth(before)).toHaveClass(/hl/);
});

test("guitar and bass amps come as a head with its cabinet", async ({ page }) => {
  await page.getByRole("tab", { name: "ステージ" }).click();
  for (const name of ["ギターアンプ（ヘッド＋キャビ）", "ベースアンプ（ヘッド＋キャビ）"]) {
    await page.getByRole("button", { name: `＋ ${name}` }).click();
    await expect(page.locator(".part-panel").getByLabel("機種")).toHaveValue("ヘッド＋キャビ（会場）");
  }
});
