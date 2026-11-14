import type { Page } from "@playwright/test";

export const savedShow = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("setlist:show:" + localStorage.getItem("setlist:last"))!));

export async function freshStart(page: Page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}
