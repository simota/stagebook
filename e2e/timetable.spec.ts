import { expect, test } from "@playwright/test";
import { freshStart, savedShow } from "./helpers";

test.beforeEach(async ({ page }) => freshStart(page));

test("timetable: the own set follows the start time, rows can be added, and it prints as sheet E", async ({ page }) => {
  await page.getByRole("tab", { name: "タイムテーブル" }).click();
  await expect(page.getByRole("button", { name: "E タイムテーブル" })).toHaveAttribute("aria-pressed", "true");
  const sheet = page.locator(".preview .sheet");
  await expect(sheet.locator("tr.ours")).toContainText("19:30〜20:00");
  await expect(sheet.locator("tr.ours")).toContainText("SAMPLE BAND（出番）");

  await page.getByRole("tab", { name: "基本情報" }).click();
  await page.getByLabel("開始時刻").fill("19:40");
  await page.getByRole("tab", { name: "タイムテーブル" }).click();
  await expect(page.locator(".timetable-row.ours")).toContainText("19:40〜20:10");
  await expect(sheet.locator("tr.ours")).toContainText("19:40〜20:10");

  await page.getByRole("button", { name: "＋ 行" }).click();
  const rows = page.locator(".timetable-row");
  await rows.last().getByLabel("行9 内容").fill("打ち上げ");
  await rows.last().getByLabel(/開始$/).fill("22:00");
  await expect(sheet.locator("tbody tr").last()).toContainText("22:00");
  await expect(sheet.locator("tbody tr").last()).toContainText("打ち上げ");
  expect((await savedShow(page)).timetable).toHaveLength(9);
});

test("a new show starts its timetable from the usual flow, with the own set waiting for a start time", async ({ page }) => {
  await page.getByRole("button", { name: "新規" }).click();
  await page.getByRole("tab", { name: "タイムテーブル" }).click();
  await page.getByRole("button", { name: "よくある流れから作る" }).click();
  await expect(page.locator(".timetable-row")).toHaveCount(7);
  await expect(page.getByRole("button", { name: "＋ 自分たちの出番" })).toBeDisabled();
  await expect(page.locator(".timetable-row.ours")).toContainText("開始時刻が未設定です");
  await page.getByRole("button", { name: "基本情報で入れる" }).click();
  await expect(page.getByRole("tab", { name: "基本情報" })).toHaveAttribute("aria-selected", "true");
});
