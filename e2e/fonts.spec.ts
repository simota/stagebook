import { expect, test, type Page } from "@playwright/test";
import { freshStart, savedShow } from "./helpers";

test.beforeEach(async ({ page }) => freshStart(page));

/** Some of the family's files are in use and nothing is still downloading. */
export const fontSettled = (page: Page, family: string) => page.waitForFunction((fam) =>
  document.fonts.status === "loaded" && [...document.fonts].some((f) => f.family.replace(/"/g, "") === fam && f.status === "loaded"), family);

/** Font size the performer sheet should have, found by stepping down 1pt at a time (the original method). */
const expectExactFit = async (page: Page) => {
  const pairs = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".perf-list")].map((list) => {
    const applied = list.style.fontSize;
    const overflows = () => list.scrollHeight > list.clientHeight + 1 || list.scrollWidth > list.clientWidth + 1;
    let size = 46;
    list.style.fontSize = `${size}pt`;
    while (size > 10 && overflows()) list.style.fontSize = `${--size}pt`;
    list.style.fontSize = applied;
    return [applied, `${size}pt`];
  }));
  for (const [applied, expected] of pairs) expect(applied).toBe(expected);
};

test("a chosen font is used by every sheet, saved with the show, and fitted after it loads", async ({ page }) => {
  const external: string[] = [];
  page.on("request", (r) => { if (!r.url().startsWith("http://127.0.0.1:4173/")) external.push(r.url()); });
  const families = () => page.evaluate(() => [...document.querySelectorAll(".sheet")].map((s) => getComputedStyle(s).fontFamily.split(",")[0]));
  expect(new Set(await families())).toEqual(new Set(['"Hiragino Sans"']));
  // The picker sits on the dark preview bar; its own text must not inherit the bar's light text colour.
  const [fg, bg] = await page.getByLabel("フォント").evaluate((el) => [getComputedStyle(el).color, getComputedStyle(el).backgroundColor]);
  expect(fg).not.toBe(bg);

  await page.getByLabel("フォント").selectOption("biz-ud");
  expect(new Set(await families())).toEqual(new Set(['"BIZ UDPGothic"']));
  await fontSettled(page, "BIZ UDPGothic");
  await expect.poll(async () => { try { await expectExactFit(page); return true; } catch { return false; } }).toBe(true);
  expect((await savedShow(page)).font).toBe("biz-ud");

  await page.reload();
  await expect(page.getByLabel("フォント")).toHaveValue("biz-ud");
  await fontSettled(page, "BIZ UDPGothic");
  await expect.poll(async () => { try { await expectExactFit(page); return true; } catch { return false; } }).toBe(true);
  expect(external).toEqual([]);

  await page.getByLabel("フォント").selectOption("system");
  expect(new Set(await families())).toEqual(new Set(['"Hiragino Sans"']));
});

test("printing waits until every printed glyph is loaded in the chosen font, then fits", async ({ page }) => {
  await page.addInitScript(() => {
    window.print = () => {
      const text = document.querySelector(".print-root")!.textContent!;
      const fam = '"Dela Gothic One"';
      (window as { printState?: unknown }).printState = {
        glyphsReady: [400, 700, 900].every((w) => document.fonts.check(`${w} 16px ${fam}`, text)),
        sizes: [...document.querySelectorAll<HTMLElement>(".perf-list")].map((l) => l.style.fontSize),
      };
    };
  });
  await page.reload();
  await page.getByLabel("フォント").selectOption("dela");
  await page.getByRole("button", { name: "このシートを印刷" }).click();
  await page.waitForFunction(() => "printState" in window);
  const state = await page.evaluate(() => (window as { printState?: { glyphsReady: boolean; sizes: string[] } }).printState!);
  expect(state.glyphsReady).toBe(true);
  await expectExactFit(page);
  const now = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".perf-list")].map((l) => l.style.fontSize));
  expect(state.sizes).toEqual(now);
});

test("a show from an older version, or with a font this version does not know, prints in the device font", async ({ page }) => {
  await page.evaluate(() => {
    const key = "setlist:show:" + localStorage.getItem("setlist:last");
    const show = JSON.parse(localStorage.getItem(key)!);
    show.font = "font-from-the-future";
    localStorage.setItem(key, JSON.stringify(show));
  });
  await page.reload();
  await expect(page.getByLabel("フォント")).toHaveValue("system");
});

test("the printed PDF embeds the chosen font", async ({ page }) => {
  await page.getByLabel("フォント").selectOption("dela");
  await fontSettled(page, "Dela Gothic One");
  await page.emulateMedia({ media: "print" });
  const pdf = (await page.pdf({ preferCSSPageSize: true })).toString("latin1");
  expect(pdf).toMatch(/\/FontName\s*\/[A-Z]{6}\+DelaGothicOne/);
});

test("the site serves the license text of every font it ships", async ({ page }) => {
  const res = await page.request.get("THIRD_PARTY_LICENSES.txt");
  expect(res.status()).toBe(200);
  const text = await res.text();
  for (const pkg of ["noto-sans-jp", "noto-serif-jp", "biz-udpgothic", "dela-gothic-one", "zen-maru-gothic"]) {
    expect(text).toMatch(new RegExp(`@fontsource(-variable)?/${pkg} [\\d.]+ \\(OFL-1\\.1\\)`));
  }
  expect(text.match(/SIL Open Font License/g)!.length).toBeGreaterThanOrEqual(5);
});
