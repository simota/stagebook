import { expect, test } from "@playwright/test";
import { freshStart, savedShow } from "./helpers";

test.beforeEach(async ({ page }) => freshStart(page));

test("timetable: start time drives per-song times on the staff sheet", async ({ page }) => {
  await page.getByRole("button", { name: "A-2 スタッフ用" }).click();
  const staff = page.locator(".preview .sheet");
  await expect(staff.locator("tbody tr").nth(1)).toContainText("19:31");
  await expect(staff).toContainText("終了予定 20:02");
  await page.getByRole("tab", { name: "基本情報" }).click();
  await page.getByLabel("開始時刻").fill("20:00");
  await page.getByRole("button", { name: "A-2 スタッフ用" }).click();
  await expect(staff.locator("tbody tr").nth(1)).toContainText("20:01");
  await page.getByLabel("開始時刻").fill("");
  await expect(staff.locator("tbody tr").nth(1)).toContainText("+1:30");
});

test("song library: adds a song from another show with its details", async ({ page }) => {
  await page.getByRole("button", { name: "新規" }).click();
  await page.getByRole("tab", { name: "セットリスト" }).click();
  await page.getByRole("button", { name: /曲ライブラリから追加/ }).click();
  await page.getByLabel("曲ライブラリを検索").fill("シグ");
  await page.getByRole("button", { name: "シグナル を追加" }).click();
  await expect(page.locator(".library [role=status]")).toContainText("シグナル");
  const item = (await savedShow(page)).items[0];
  expect(item).toMatchObject({ title: "シグナル", bpm: 132, key: "A", durSec: 225, link: "曲間なし" });
  expect(item.light.colors).toEqual(["yellow", "orange"]);
  await expect(page.locator(".preview .p-title")).toContainText(["シグナル"]);
});

test("backup: restores every show into a fresh browser", async ({ page }, info) => {
  await page.getByRole("button", { name: "サンプル" }).click();
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "全公演をバックアップ" }).click()]);
  const file = info.outputPath("backup.json");
  await dl.saveAs(file);
  await expect(page.locator(".notice[role=status]")).toContainText("全 2 件");
  await freshStart(page);
  await page.locator('input[type="file"]').setInputFiles(file);
  await expect(page.locator(".notice[role=status]")).toContainText("2 件の公演を復元しました");
  await expect(page.locator(".topbar select option")).toHaveCount(3);
});

test("share link: the recipient opens the same show in their own browser", async ({ page, browser, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("tab", { name: "基本情報" }).click();
  await page.getByLabel("バンド名").fill("LINK BAND");
  await page.getByRole("button", { name: "共有リンクをコピー" }).click();
  await expect(page.locator(".notice[role=status]")).toContainText("共有リンクをコピーしました");
  const url = await page.evaluate(() => navigator.clipboard.readText());
  expect(url).toContain("#show=");

  const other = await browser.newContext();
  const recipient = await other.newPage();
  await recipient.goto(url);
  await expect(recipient.locator(".preview .hd .band")).toHaveText("LINK BAND");
  await expect(recipient.locator(".notice[role=status]")).toContainText("共有リンクから");
  expect(new URL(recipient.url()).hash).toBe("");
  await recipient.goto(url.replace(/#show=(.{20}).*/, "#show=$1"));
  await expect(recipient.locator(".notice[role=alert]")).toContainText("共有リンクが途中で切れて");
  await other.close();
});

test("text: a plain list of titles becomes a setlist", async ({ page }) => {
  await page.getByRole("tab", { name: "テキスト" }).click();
  await page.getByLabel("テキストで編集").fill("# PASTE\n## セットリスト\n一曲目\n二曲目\nMC: 挨拶\n三曲目");
  await page.getByRole("button", { name: /フォームに反映/ }).click();
  await expect(page.locator(".preview .p-title")).toHaveText(["一曲目", "二曲目", "三曲目"]);
});

test("print options: each sheet's items can be turned off and back on", async ({ page }) => {
  const sheet = page.locator(".preview .sheet");
  const options = page.locator(".print-options");

  await options.getByText("表示する項目").click();
  await options.getByLabel("曲番号").uncheck();
  await options.getByLabel("MC・転換・メモ").uncheck();
  await expect(sheet.locator(".p-no").first()).toBeHidden();
  await expect(sheet.locator(".p-mc")).toHaveCount(0);
  await options.getByLabel("連絡先").uncheck();
  await expect(sheet.locator(".hd")).not.toContainText("090-0000-0000");

  await page.getByRole("button", { name: "A-2 スタッフ用" }).click();
  await options.getByText("表示する項目").click();
  await options.getByLabel("BPM").uncheck();
  await expect(sheet.locator("thead th")).not.toContainText(["BPM"]);
  await expect(sheet.locator("thead th")).toHaveCount(9);
  await expect(sheet.locator("tr.div td")).toHaveAttribute("colspan", "9");
  await expect(sheet.locator(".hd")).not.toContainText("090-0000-0000");

  await page.getByRole("button", { name: "B ステージ図" }).click();
  await options.getByText("表示する項目").click();
  await options.getByLabel("チャンネル表").uncheck();
  await options.getByLabel("返しの要望").uncheck();
  await expect(sheet.getByText("チャンネル表")).toHaveCount(0);
  await expect(sheet.getByText("返し（モニター）の要望")).toHaveCount(0);
  await expect(sheet.getByText("機材表")).toBeVisible();

  await page.getByRole("button", { name: "C 音響照明" }).click();
  await options.getByText("表示する項目").click();
  await options.getByLabel("全般の要望").uncheck();
  await options.getByLabel("動き").uncheck();
  await expect(sheet.locator(".general")).toHaveCount(0);
  await expect(sheet.locator("thead th")).toHaveCount(7);

  await page.reload();
  await page.getByRole("button", { name: "A-2 スタッフ用" }).click();
  await expect(page.locator(".preview .sheet thead th")).toHaveCount(9);
  await expect(page.getByRole("button", { name: "元に戻す" })).toBeDisabled();

  await page.getByRole("button", { name: "C 音響照明" }).click();
  await page.locator(".print-options").getByText("表示する項目").click();
  await page.locator(".print-options").getByLabel("動き").check();
  await expect(page.locator(".preview .sheet thead th")).toHaveCount(8);
  await page.getByRole("button", { name: "元に戻す" }).click();
  await expect(page.locator(".preview .sheet thead th")).toHaveCount(7);
});

test("print options apply to the printed pages too", async ({ page }) => {
  await page.getByRole("button", { name: "B ステージ図" }).click();
  await page.locator(".print-options").getByText("表示する項目").click();
  await page.locator(".print-options").getByLabel("ステージ図").uncheck();
  await expect(page.locator(".print-root .stage")).toHaveCount(0);
  await expect(page.locator(".print-root").getByText("チャンネル表")).toHaveCount(1);
});
