import { expect, test, type Page } from "@playwright/test";
import { freshStart } from "./helpers";

const orientations = async (page: Page) => {
  await page.emulateMedia({ media: "print" });
  const pdf = await page.pdf({ preferCSSPageSize: true });
  const boxes = [...pdf.toString("latin1").matchAll(/\/MediaBox\s*\[([^\]]*)\]/g)].map((m) => m[1].trim().split(/\s+/).map(Number));
  return boxes.map(([, , w, h]) => (w < h ? "portrait" : "landscape"));
};

test("prints every sheet on A4: two portrait, two landscape, the door list and the timetable", async ({ page }) => {
  await freshStart(page);
  expect(await orientations(page)).toEqual(["portrait", "portrait", "landscape", "landscape", "portrait", "portrait"]);
});

test("a show without reservations or a timetable prints the four sheets only", async ({ page }) => {
  await freshStart(page);
  await page.getByRole("button", { name: "新規" }).click();
  expect(await orientations(page)).toEqual(["portrait", "portrait", "landscape", "landscape"]);
});
