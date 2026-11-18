import { expect, test } from "@playwright/test";
import { freshStart, savedShow } from "./helpers";

test.beforeEach(async ({ page }) => freshStart(page));

const tanaka = async (page: import("@playwright/test").Page) =>
  (await savedShow(page)).stageParts.find((p: { id: string }) => p.id === "p-tanaka");

test("stage keys act only on the canvas: other controls keep their own arrow and Backspace keys", async ({ page }) => {
  await page.getByRole("tab", { name: "ステージ" }).click();
  await page.getByRole("button", { name: /^田中/ }).focus();
  await expect(page.locator(".part-panel legend")).toContainText("田中");

  await page.locator(".channels .handle").first().focus();
  await page.keyboard.press("ArrowRight");
  await page.getByRole("button", { name: /入力を追加/ }).focus();
  await page.keyboard.press("Backspace");
  expect(await tanaka(page)).toMatchObject({ x: 28 });

  await page.getByRole("button", { name: /^田中/ }).focus();
  await page.keyboard.press("ArrowRight");
  expect(await tanaka(page)).toMatchObject({ x: 29 });
});

test("a duration field shows the restored value after undo and redo", async ({ page }) => {
  const dur = page.locator(".item-row").nth(1).getByLabel("尺");
  await expect(dur).toHaveValue("4:10");
  await dur.fill("5:00");
  await dur.press("Tab");
  await page.getByRole("button", { name: "元に戻す" }).click();
  await expect(dur).toHaveValue("4:10");
  await page.getByRole("button", { name: "やり直す" }).click();
  await expect(dur).toHaveValue("5:00");
});

test("unapplied text survives switching tabs, and is dropped when another show opens", async ({ page }) => {
  await page.getByRole("tab", { name: "テキスト" }).click();
  const area = page.getByLabel("テキストで編集");
  await area.fill("# DRAFT BAND");
  await page.getByRole("tab", { name: "基本情報" }).click();
  await page.getByRole("tab", { name: "テキスト" }).click();
  await expect(area).toHaveValue("# DRAFT BAND");
  await expect(page.getByText("未反映の変更があります")).toBeVisible();
  await expect(page.locator(".text-stale")).toHaveCount(0);

  await page.getByRole("tab", { name: "基本情報" }).click();
  await page.getByLabel("会場").fill("OTHER HALL");
  await page.getByRole("tab", { name: "テキスト" }).click();
  await expect(area).toHaveValue("# DRAFT BAND");
  await expect(page.locator(".text-stale")).toContainText("上書きされます");

  await page.getByRole("button", { name: "新規" }).click();
  await expect(area).toHaveValue(/^# 新しいバンド/);
});

test("the song library closes with Escape and returns focus to its button", async ({ page }) => {
  const toggle = page.getByRole("button", { name: /曲ライブラリから追加/ });
  await page.getByRole("button", { name: "サンプル" }).click();
  await toggle.click();
  await expect(page.getByLabel("曲ライブラリを検索")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator(".library")).toHaveCount(0);
  await expect(toggle).toBeFocused();

  await toggle.click();
  await page.getByRole("button", { name: "閉じる", exact: true }).click();
  await expect(toggle).toBeFocused();
});

test("a share link that cannot be built is reported", async ({ page }) => {
  await page.addInitScript(() => {
    (window as { CompressionStream?: unknown }).CompressionStream = undefined;
  });
  await page.reload();
  await page.getByRole("button", { name: "共有リンクをコピー" }).click();
  await expect(page.getByRole("alert")).toContainText("共有リンクを作れませんでした");
});

test("the performer sheet's font size matches a 1pt-step search for short and long setlists", async ({ page }) => {
  const linearSearch = () => page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".perf-list")].map((list) => {
    const applied = list.style.fontSize;
    const overflows = () => list.scrollHeight > list.clientHeight + 1 || list.scrollWidth > list.clientWidth + 1;
    let size = 72;
    list.style.fontSize = `${size}pt`;
    while (size > 10 && overflows()) list.style.fontSize = `${--size}pt`;
    list.style.fontSize = applied;
    return [applied, `${size}pt`];
  }));
  for (const n of [0, 6, 25, 50]) {
    await freshStart(page);
    await page.evaluate((n) => {
      const id = localStorage.getItem("setlist:last")!;
      const show = JSON.parse(localStorage.getItem("setlist:show:" + id)!);
      const song = show.items.find((i: { kind: string }) => i.kind === "song");
      show.items = Array.from({ length: n }, (_, k) => ({ ...song, id: `s-${k}`, title: `曲 ${k}`.repeat((k % 4) + 1) }));
      localStorage.setItem("setlist:show:" + id, JSON.stringify(show));
    }, n);
    await page.reload();
    for (const [applied, expected] of await linearSearch()) expect(applied, `${n} items`).toBe(expected);
  }
});

test("the built page carries a CSP that the app's own features never violate", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.addInitScript(() => {
    (window as { cspViolations?: string[] }).cspViolations = [];
    document.addEventListener("securitypolicyviolation", (e) => (window as { cspViolations?: string[] }).cspViolations!.push(`${e.violatedDirective} ${e.blockedURI}`));
  });
  await page.reload();
  await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveAttribute("content", /script-src 'self'/);
  for (const name of ["基本情報", "メンバー", "セットリスト", "ステージ", "機材・返し", "音響照明", "取り置き", "タイムテーブル", "テキスト"]) {
    await page.getByRole("tab", { name }).click();
  }
  for (const name of ["A-1 演者用", "A-2 スタッフ用", "B ステージ図", "C 音響照明"]) await page.getByRole("button", { name }).click();
  await page.getByLabel("フォント").selectOption("zen-maru");
  await page.waitForFunction(() => document.fonts.status === "loaded" && [...document.fonts].some((f) => f.family.includes("Zen Maru Gothic") && f.status === "loaded"));
  await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "JSON書き出し" }).click()]);
  await page.getByRole("button", { name: "共有リンクをコピー" }).click();
  await expect(page.getByRole("status")).toContainText("共有リンクをコピーしました");
  const link = await page.evaluate(() => navigator.clipboard.readText());
  await page.goto(link);
  await expect(page.getByRole("status")).toContainText("共有リンクから");
  await page.emulateMedia({ media: "print" });
  expect(await page.evaluate(() => (window as { cspViolations?: string[] }).cspViolations)).toEqual([]);
});

test("the performer sheet's font size stays exact while the setlist grows and shrinks without a reload", async ({ page }) => {
  const check = async (label: string) => {
    const pairs = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".perf-list")].map((list) => {
      const applied = list.style.fontSize;
      const overflows = () => list.scrollHeight > list.clientHeight + 1 || list.scrollWidth > list.clientWidth + 1;
      let size = 72;
      list.style.fontSize = `${size}pt`;
      while (size > 10 && overflows()) list.style.fontSize = `${--size}pt`;
      list.style.fontSize = applied;
      return [applied, `${size}pt`];
    }));
    for (const [applied, expected] of pairs) expect(applied, label).toBe(expected);
  };
  const rows = page.locator(".item-row");
  for (let k = 0; k < 14; k++) {
    await page.getByRole("button", { name: "＋ 曲" }).click();
    await rows.last().getByLabel("曲名").fill(`追加した曲 ${k} `.repeat((k % 3) + 1));
    await check(`after adding ${k + 1}`);
  }
  await rows.nth(1).getByLabel("曲名").fill("とても長いタイトルの曲".repeat(4));
  await check("after a very long title");
  for (let k = 0; k < 20; k++) {
    await rows.first().getByRole("button", { name: /を削除/ }).click();
    await check(`after deleting ${k + 1}`);
  }
});

test("the page carries share-card metadata and serves its OGP image", async ({ page, request }) => {
  const og = (property: string) => page.locator(`meta[property="${property}"]`);
  await expect(og("og:title")).toHaveAttribute("content", /Stagebook/);
  await expect(og("og:image")).toHaveAttribute("content", "https://simota.github.io/stagebook/ogp.png");
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /.+/);

  const image = await request.get("ogp.png");
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toBe("image/png");
});

test("every favicon the page links to is served with its image type", async ({ page, request }) => {
  const links = page.locator('link[rel="icon"], link[rel="apple-touch-icon"]');
  await expect(links).toHaveCount(3);
  for (const href of await links.evaluateAll((els) => els.map((el) => el.getAttribute("href") ?? ""))) {
    const res = await request.get(href);
    expect(res.status(), href).toBe(200);
    expect(res.headers()["content-type"], href).toMatch(/^image\/(svg\+xml|png)/);
  }
});
