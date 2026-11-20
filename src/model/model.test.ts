import { describe, expect, it } from "vitest";
import { channelLabel, channelsByPart, doorList, parseDuration, partLabel, powerTotal, reservationText, reservationTotalLabel, reservationTotals, rowTimes, songNumbers, timetableTemplate, totalSec } from "./derive";
import { PART_TEMPLATES } from "./presets";
import { sampleShow } from "./sample";
import { emptyShow, parseShow } from "./show";

describe("derive", () => {
  const show = sampleShow();

  it("numbers songs only, skipping SE / MC / encore", () => {
    const nos = songNumbers(show);
    expect(nos.get("i2")).toBe(1);
    expect(nos.get("i4")).toBeUndefined();
    expect(nos.get("i11")).toBe(7);
  });

  it("sums durations and power", () => {
    expect(totalSec(show)).toBe(1935);
    expect(powerTotal(show)).toBe(4);
  });

  it("assigns channels by position in inputs", () => {
    const chs = channelsByPart(show);
    expect(chs.get("drums")).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(chs.get("pc")).toEqual([15, 16]);
  });

  it("renumbers when inputs are reordered", () => {
    const s = sampleShow();
    s.inputs.push(s.inputs.shift()!);
    expect(channelsByPart(s).get("drums")).toEqual([1, 2, 3, 4, 5, 6, 7, 16]);
  });

  it("labels channel runs", () => {
    expect(channelLabel([1, 2, 3])).toBe("1–3");
    expect(channelLabel([9])).toBe("9");
    expect(channelLabel([9, 12])).toBe("9,12");
  });

  it("labels parts from linked members", () => {
    const person = show.stageParts.find((p) => p.id === "p-yamada")!;
    const drums = show.stageParts.find((p) => p.id === "drums")!;
    expect(partLabel(show, person)).toEqual({ label: "山田", sub: "Gt.Vo" });
    expect(partLabel(show, drums).label).toBe("Dr 佐藤");
  });

  it("parses durations", () => {
    expect(parseDuration("4:10")).toBe(250);
    expect(parseDuration("3")).toBe(180);
    expect(parseDuration("")).toBeNull();
    expect(parseDuration("3:")).toBeUndefined();
    expect(parseDuration("abc")).toBeUndefined();
  });
});

describe("parseShow", () => {
  it("accepts the sample and an empty show", () => {
    expect(parseShow(sampleShow()).ok).toBe(true);
    expect(parseShow(emptyShow()).ok).toBe(true);
  });

  it("survives a JSON round trip", () => {
    const s = sampleShow();
    const r = parseShow(JSON.parse(JSON.stringify(s)));
    expect(r.ok && r.show).toEqual(s);
  });

  it("rejects an unknown schema version", () => {
    const r = parseShow({ ...sampleShow(), schemaVersion: 2 });
    expect(r.ok).toBe(false);
  });

  it("rejects a part outside the stage and reports the path", () => {
    const s = sampleShow();
    s.stageParts[0].x = 999;
    const r = parseShow(s);
    expect(r).toMatchObject({ ok: false, error: expect.stringContaining("stageParts.0.x") });
  });

  it("rejects non-show JSON", () => {
    expect(parseShow({ hello: 1 }).ok).toBe(false);
    expect(parseShow(null).ok).toBe(false);
  });
});

describe("parseShow messages", () => {
  it("explains non-show JSON in plain words", () => {
    expect(parseShow({ hello: 1 })).toEqual({ ok: false, error: "このアプリで書き出した公演データではありません" });
    expect(parseShow({ ...sampleShow(), schemaVersion: 2 })).toMatchObject({ ok: false, error: expect.stringContaining("schemaVersion: 2") });
  });
});

describe("timetable", () => {
  it("offsets each item by the durations before it", async () => {
    const { startOffsets, clockAt, itemStartLabel } = await import("./derive");
    const show = sampleShow();
    const offsets = startOffsets(show);
    expect(offsets.get("i1")).toBe(0);
    expect(offsets.get("i2")).toBe(90);
    expect(offsets.get("i4")).toBe(90 + 250 + 225);
    expect(itemStartLabel(show, offsets.get("i2")!)).toBe("19:31");
    expect(itemStartLabel({ ...show, meta: { ...show.meta, startTime: "" } }, 90)).toBe("+1:30");
    expect(clockAt("23:50", 20 * 60)).toBe("00:10");
  });

  it("accepts data saved before startTime existed", () => {
    const { startTime: _drop, ...meta } = sampleShow().meta;
    const r = parseShow({ ...sampleShow(), meta });
    expect(r.ok && r.show.meta.startTime).toBe("");
  });

  it("rejects an impossible start time", () => {
    const s = sampleShow();
    expect(parseShow({ ...s, meta: { ...s.meta, startTime: "25:00" } }).ok).toBe(false);
  });
});

describe("print options", () => {
  it("shows everything for data saved before print options existed", () => {
    const { print: _p, ...rest } = sampleShow();
    const performer = { inverse: true, showBpm: false, showNote: true };
    const r = parseShow({ ...rest, performer });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.show.performer).toEqual({ ...performer, showNumbers: true, showLink: true, showSe: true, showMc: true });
    expect(Object.values(r.show.print).flatMap((g) => Object.values(g)).every(Boolean)).toBe(true);
  });

  it("keeps toggles that were turned off", () => {
    const s = sampleShow();
    s.print.staff.bpm = false;
    s.print.header.contact = false;
    const r = parseShow(JSON.parse(JSON.stringify(s)));
    expect(r.ok && [r.show.print.staff.bpm, r.show.print.header.contact, r.show.print.staff.key]).toEqual([false, false, true]);
  });
});

describe("references on load", () => {
  it("keeps every link of a consistent show unchanged", () => {
    const s = sampleShow();
    expect(parseShow(JSON.parse(JSON.stringify(s)))).toEqual({ ok: true, show: s });
  });

  it("cuts links to stage parts and members that do not exist", () => {
    const s = sampleShow();
    s.stageParts[0].memberId = "ghost";
    s.inputs[0].partId = "no-part";
    s.gear[0].memberId = "ghost";
    s.monitors[0] = { ...s.monitors[0], memberId: "ghost", wedgePartId: "no-part" };
    const r = parseShow(s);
    if (!r.ok) throw new Error(r.error);
    expect(r.show.stageParts[0].memberId).toBeNull();
    expect(r.show.inputs[0].partId).toBe("");
    expect(r.show.gear[0].memberId).toBeNull();
    expect(r.show.monitors[0]).toMatchObject({ memberId: null, wedgePartId: null, req: s.monitors[0].req });
    expect(r.show.inputs).toHaveLength(s.inputs.length);
    expect(r.show.monitors).toHaveLength(s.monitors.length);
  });
});

describe("sheet font", () => {
  it("reads older data without a font as the device font", () => {
    const { font: _font, ...old } = sampleShow();
    expect(parseShow(old)).toMatchObject({ ok: true, show: { font: "system" } });
  });

  it("keeps a known font and falls back for one this version does not know", () => {
    expect(parseShow({ ...sampleShow(), font: "biz-ud" })).toMatchObject({ ok: true, show: { font: "biz-ud" } });
    expect(parseShow({ ...sampleShow(), font: "future-font" })).toMatchObject({ ok: true, show: { font: "system" } });
  });
});

describe("reservations", () => {
  const withGuests = () => {
    const s = sampleShow();
    s.reservations = [
      { id: "a", name: "山本", kana: "やまもと", count: 2, memberId: "yamada", status: "予約", note: "" },
      { id: "b", name: "相川", kana: "あいかわ", count: 1, memberId: null, status: "来場", note: "" },
      { id: "c", name: "中村", kana: "なかむら", count: 4, memberId: "yamada", status: "キャンセル", note: "" },
      { id: "d", name: "Brown", kana: "", count: 1, memberId: "suzuki", status: "予約", note: "車椅子" },
    ];
    return s;
  };

  it("lists guests by reading, leaving out cancellations", () => {
    expect(doorList(withGuests()).map((r) => r.name)).toEqual(["Brown", "相川", "山本"]);
  });

  it("totals tickets overall and per member", () => {
    expect(reservationTotals(withGuests())).toEqual({
      tickets: 4, guests: 3, uncounted: 0, byMember: [{ name: "山田", tickets: 2 }, { name: "鈴木", tickets: 1 }, { name: "担当なし", tickets: 1 }],
    });
  });

  it("writes the list as text, following the sheet's columns", () => {
    const s = withGuests();
    expect(reservationText(s)).toBe(
      "【取り置き】SAMPLE BAND（2026-12-05 SAMPLE HALL）\nBrown 1枚 担当: 鈴木 車椅子\n相川（あいかわ） 1枚\n山本（やまもと） 2枚 担当: 山田\n計 4枚（3件）",
    );
    s.print.reserve = { kana: false, member: false, note: false };
    expect(reservationText(s).split("\n")[1]).toBe("Brown 1枚");
  });

  it("leaves a blank ticket count out of the total and says how many are blank", () => {
    const s = withGuests();
    s.reservations[0].count = null;
    const totals = reservationTotals(s);
    expect(totals).toMatchObject({ tickets: 2, guests: 3, uncounted: 1 });
    expect(totals.byMember[0]).toEqual({ name: "山田", tickets: 0 });
    expect(reservationTotalLabel(totals)).toBe("2枚（3件、枚数未記入 1件）");
    const lines = reservationText(s).split("\n");
    expect(lines[3]).toBe("山本（やまもと） 担当: 山田");
    expect(lines[4]).toBe("計 2枚（3件、枚数未記入 1件）");
    expect(parseShow(s).ok).toBe(true);
  });

  it("reads older data without blank rows as none, and refuses a negative count", () => {
    const { reservationBlankRows: _b, ...old } = sampleShow();
    expect(parseShow(old)).toMatchObject({ ok: true, show: { reservationBlankRows: 0 } });
    expect(parseShow({ ...sampleShow(), reservationBlankRows: -1 }).ok).toBe(false);
  });

  it("reads older data without reservations, and unlinks a missing member", () => {
    const { reservations: _r, ...old } = sampleShow();
    expect(parseShow(old)).toMatchObject({ ok: true, show: { reservations: [] } });
    const s = withGuests();
    s.reservations[0].memberId = "ghost";
    const r = parseShow(s);
    expect(r.ok && r.show.reservations[0].memberId).toBeNull();
  });
});

describe("timetable", () => {
  it("times the band's own set from the start time and slot, and other rows as entered", () => {
    const s = sampleShow();
    const ours = s.timetable.find((r) => r.kind === "ours")!;
    expect(rowTimes(s, ours)).toEqual({ start: "19:30", end: "20:00" });
    expect(rowTimes({ ...s, meta: { ...s.meta, startTime: "23:45" } }, ours)).toEqual({ start: "23:45", end: "00:15" });
    expect(rowTimes({ ...s, meta: { ...s.meta, startTime: "" } }, ours)).toEqual({ start: "", end: "" });
    expect(rowTimes(s, s.timetable[1])).toEqual({ start: "16:30", end: "18:00" });
  });

  it("starts from a template with one own-set row, and reads older data as no timetable", () => {
    let n = 0;
    const rows = timetableTemplate(() => `t${n++}`);
    expect(rows.filter((r) => r.kind === "ours")).toHaveLength(1);
    expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
    const { timetable: _t, ...old } = sampleShow();
    expect(parseShow(old)).toMatchObject({ ok: true, show: { timetable: [] } });
    expect(parseShow({ ...sampleShow(), timetable: [{ ...sampleShow().timetable[0], start: "25:00" }] }).ok).toBe(false);
  });
});

describe("part presets", () => {
  it("have unique keys and names, and every input is a complete channel", () => {
    expect(new Set(PART_TEMPLATES.map((t) => t.key)).size).toBe(PART_TEMPLATES.length);
    expect(new Set(PART_TEMPLATES.map((t) => t.name)).size).toBe(PART_TEMPLATES.length);
    for (const t of PART_TEMPLATES) for (const i of t.inputs) expect(i.name && i.mic, `${t.key}`).toBeTruthy();
  });

  it("each placed on a show still gives valid data", () => {
    for (const t of PART_TEMPLATES) {
      const s = emptyShow();
      s.stageParts.push({ id: "p", type: t.type, x: 80, y: 22, w: t.w, h: t.h, rot: 0, label: t.label, sub: t.sub ?? "", memberId: null });
      s.inputs.push(...t.inputs.map((i, n) => ({ ...i, id: `i${n}`, partId: "p" })));
      expect(parseShow(JSON.parse(JSON.stringify(s))).ok, t.key).toBe(true);
    }
  });
});
