import { describe, expect, it } from "vitest";
import { sampleShow } from "./sample";
import type { Show } from "./show";
import { parseShowText, serializeShowText } from "./text";

const withoutIds = (s: Show) => ({ ...s, items: s.items.map(({ id: _id, ...rest }) => rest) });

function parse(text: string, base = sampleShow()) {
  const r = parseShowText(text, base);
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  return r.show;
}

describe("show text", () => {
  it("round-trips the sample without loss", () => {
    const s = sampleShow();
    expect(withoutIds(parse(serializeShowText(s), s))).toEqual(withoutIds(s));
  });

  it("round-trips multi-line general requests and a cue containing slashes", () => {
    const s = sampleShow();
    s.general.sound = "1行目\n2行目";
    s.items[1].light.cue = "A/B / C";
    expect(withoutIds(parse(serializeShowText(s), s))).toEqual(withoutIds(s));
  });

  it("reads hand-written text", () => {
    const show = parse([
      "# MY BAND",
      "日付: 2026-12-05",
      "持ち時間: 25",
      "",
      "## セットリスト",
      "SE: Opening SE | 1:30",
      "1. 夜明けのスロープ | 168 | E | 4:10",
      "   > カウント4つで入る",
      "   照明: 赤 白 / 激しく / 明 / 速い / 頭のキメで全灯",
      "2. シグナル | 132 | F#m | 3:45 | 曲間なし",
      "MC: 自己紹介",
      "---ENCORE---",
      "- またね",
    ].join("\n"));
    expect(show.meta).toMatchObject({ band: "MY BAND", date: "2026-12-05", slotSec: 1500, venue: "" });
    expect(show.items.map((i) => [i.kind, i.title])).toEqual([
      ["se", "Opening SE"], ["song", "夜明けのスロープ"], ["song", "シグナル"], ["mc", "自己紹介"], ["encore", "ENCORE"], ["song", "またね"],
    ]);
    expect(show.items[1]).toMatchObject({ bpm: 168, key: "E", durSec: 250, note: "カウント4つで入る" });
    expect(show.items[1].light).toEqual({ colors: ["red", "white"], mood: "激しく", level: "明", motion: "速い", cue: "頭のキメで全灯" });
    expect(show.items[2]).toMatchObject({ key: "F#m", link: "曲間なし" });
  });

  it("keeps the parts that text does not cover", () => {
    const base = sampleShow();
    const show = parse("# X\n## セットリスト\n1. A\n", base);
    expect(show.stageParts).toBe(base.stageParts);
    expect(show.members).toBe(base.members);
    expect(show.performer).toBe(base.performer);
  });

  it("reports every bad line with its line number and changes nothing", () => {
    const r = parseShowText([
      "# X",
      "会場名: どこか",
      "## セットリスト",
      "  > 項目より前",
      "1. A",
      "  照明: 金 / / / /",
      "  テンポ: 120",
      "開始: 25:00",
      "## おまけ",
    ].join("\n"), sampleShow());
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.map((e) => e.line)).toEqual([2, 4, 6, 7, 9]);
    expect(r.errors[2].message).toContain("金");
  });
});

describe("plain lists and start time", () => {
  it("treats unmarked lines as songs so a pasted list of titles works", () => {
    const show = parse("## セットリスト\n夜明けのスロープ\nシグナル | 132 | 3:45\nMC: 挨拶\nBlue Hour");
    expect(show.items.map((i) => [i.kind, i.title])).toEqual([
      ["song", "夜明けのスロープ"], ["song", "シグナル"], ["mc", "挨拶"], ["song", "Blue Hour"],
    ]);
    expect(show.items[1]).toMatchObject({ bpm: 132, durSec: 225 });
  });

  it("reads 開始 in the header and pads single-digit hours", () => {
    expect(parse("# X\n開始: 9:05\n").meta.startTime).toBe("09:05");
    expect(parseShowText("# X\n開始: 25:00", sampleShow())).toMatchObject({ ok: false, errors: [{ line: 2 }] });
  });
});
