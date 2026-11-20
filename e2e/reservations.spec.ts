import { expect, test } from "@playwright/test";
import { freshStart, savedShow } from "./helpers";

test.beforeEach(async ({ page }) => freshStart(page));

test("reservations: entered, sorted by reading on the door list, cancellations dropped, copied as text", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("tab", { name: "取り置き" }).click();
  const sheet = page.locator(".preview .sheet");
  await expect(page.getByRole("button", { name: "D 取り置き" })).toHaveAttribute("aria-pressed", "true");
  await expect(sheet.locator("tbody tr td:nth-child(2)")).toHaveText(["伊藤 花子", "高橋 一郎", "渡辺 健"]);
  await expect(sheet.locator(".tot")).toContainText("合計 6枚（3件）");

  await page.getByRole("button", { name: "＋ 予約" }).click();
  await page.getByLabel("予約4 お名前").fill("青木 翔");
  await page.getByLabel("予約4 よみがな").fill("あおき しょう");
  await page.getByLabel("予約4 枚数").fill("2");
  await page.getByLabel("予約4 担当メンバー").selectOption({ label: "田中" });
  await expect(sheet.locator("tbody tr td:nth-child(2)")).toHaveText(["青木 翔", "伊藤 花子", "高橋 一郎", "渡辺 健"]);
  await expect(sheet.locator(".tot")).toContainText("合計 8枚（4件）");
  await expect(sheet.locator(".tot")).toContainText("田中 2枚");

  await page.getByLabel("予約3 状態").selectOption("キャンセル");
  await expect(sheet.locator("tbody tr td:nth-child(2)")).toHaveText(["青木 翔", "伊藤 花子", "高橋 一郎"]);
  await expect(sheet.locator(".tot")).toContainText("合計 5枚（3件）");

  await page.getByRole("button", { name: "テキストでコピー" }).click();
  await expect(page.locator(".notice[role=status]")).toContainText("3件・5枚");
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text.split("\n")).toEqual([
    "【取り置き】SAMPLE BAND（2026-12-05 SAMPLE HALL）",
    "青木 翔（あおき しょう） 2枚 担当: 田中",
    "伊藤 花子（いとう はなこ） 1枚 担当: 鈴木 物販も見たい",
    "高橋 一郎（たかはし いちろう） 2枚 担当: 山田",
    "計 5枚（3件）",
  ]);
  expect((await savedShow(page)).reservations).toHaveLength(4);
  await page.reload();
  await page.getByRole("tab", { name: "取り置き" }).click();
  await expect(page.locator(".reserve-row")).toHaveCount(4);
});

test("removing a member unassigns their guests instead of dropping them", async ({ page }) => {
  await page.getByRole("tab", { name: "メンバー" }).click();
  await page.getByRole("button", { name: "佐藤 を削除" }).click();
  const r = (await savedShow(page)).reservations.find((x: { name: string }) => x.name === "渡辺 健");
  expect(r.memberId).toBeNull();
});

test("a share link does not carry the guests' names, and says so", async ({ page, browser, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "共有リンクをコピー" }).click();
  await expect(page.locator(".notice[role=status]")).toContainText("取り置きリストは入りません");
  const url = await page.evaluate(() => navigator.clipboard.readText());
  const other = await browser.newContext();
  const recipient = await other.newPage();
  await recipient.goto(url);
  await expect(recipient.locator(".notice[role=status]")).toContainText("共有リンクから");
  await recipient.getByRole("tab", { name: "取り置き" }).click();
  await expect(recipient.locator(".reserve-row")).toHaveCount(0);
  expect(await recipient.evaluate(() => document.body.innerText.includes("高橋 一郎"))).toBe(false);
  await other.close();
});

test("a ticket count can be left blank, and blank rows are printed for writing guests in by hand", async ({ page }) => {
  await page.getByRole("tab", { name: "取り置き" }).click();
  const sheet = page.locator(".preview .sheet");
  await page.getByLabel("予約1 枚数").fill("");
  await expect(sheet.locator(".tot")).toContainText("合計 4枚（3件、枚数未記入 1件）");
  const takahashi = sheet.locator("tbody tr", { hasText: "高橋 一郎" });
  await expect(takahashi.locator("td:nth-child(4)")).toHaveText("");
  expect((await savedShow(page)).reservations[0].count).toBeNull();

  await expect(sheet.locator("tbody tr.blank")).toHaveCount(0);
  await page.getByLabel("手書き用の空欄の行数").fill("5");
  await expect(sheet.locator("tbody tr.blank")).toHaveCount(5);
  await expect(sheet.locator("tbody tr.blank").first().locator("td").first()).toHaveText("4");
  await expect(sheet.locator("tbody tr.blank").last().locator("td").first()).toHaveText("8");
  await expect(sheet.locator("tbody tr.blank").first().locator("td:nth-child(2)")).toHaveText("");
  // Handwritten guests are not in the computed total, so the total is left blank to fill in.
  await expect(sheet.locator(".tot")).toHaveText("合計 枚（件）");
  await expect(sheet.locator(".tot .fill")).toHaveCount(2);
  await expect(page.locator(".time-bar")).toContainText("合計 4枚（3件、枚数未記入 1件）");
  await page.getByLabel("手書き用の空欄の行数").fill("0");
  await expect(sheet.locator(".tot")).toContainText("合計 4枚（3件、枚数未記入 1件）");
  await page.getByLabel("手書き用の空欄の行数").fill("5");

  await page.reload();
  await page.getByRole("tab", { name: "取り置き" }).click();
  await expect(page.getByLabel("手書き用の空欄の行数")).toHaveValue("5");
  await expect(page.getByLabel("予約1 枚数")).toHaveValue("");
});

test("with no guests, the sheet is all blank rows to fill in by hand", async ({ page }) => {
  await page.getByRole("tab", { name: "取り置き" }).click();
  for (const name of ["高橋 一郎", "伊藤 花子", "渡辺 健"]) await page.getByRole("button", { name: `${name} を削除` }).click();
  const sheet = page.locator(".preview .sheet");
  await expect(sheet.locator(".reserve-empty")).toBeVisible();
  await page.getByLabel("手書き用の空欄の行数").fill("20");
  await expect(sheet.locator("tbody tr.blank")).toHaveCount(20);
  await expect(sheet.locator(".reserve-empty")).toHaveCount(0);
  await expect(sheet.locator(".tot .fill")).toHaveCount(2);
});
