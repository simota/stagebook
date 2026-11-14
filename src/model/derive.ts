import type { Reservation, Show, StagePart, TimetableRow } from "./show";

/** How a show is named in the show picker and in exported file names. */
export const showTitle = (s: Show) =>
  [s.meta.date, s.meta.band, s.meta.venue].filter(Boolean).join(" ") || "無題";

export function songNumbers(show: Show): Map<string, number> {
  const nos = new Map<string, number>();
  for (const it of show.items) if (it.kind === "song") nos.set(it.id, nos.size + 1);
  return nos;
}

/** Seconds from the start of the set to the start of each item; items without a duration take no time. */
export function startOffsets(show: Show): Map<string, number> {
  const offsets = new Map<string, number>();
  let t = 0;
  for (const it of show.items) {
    offsets.set(it.id, t);
    t += it.durSec ?? 0;
  }
  return offsets;
}

/** "19:30" + 150s → "19:32"; wraps past midnight. */
export function clockAt(startTime: string, offsetSec: number): string {
  const [h, m] = startTime.split(":").map(Number);
  const minutes = (h * 60 + m + Math.floor(offsetSec / 60)) % (24 * 60);
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/** Clock time when a start time is set, otherwise elapsed time from the start ("+4:10"). */
export function itemStartLabel(show: Show, offsetSec: number): string {
  return show.meta.startTime ? clockAt(show.meta.startTime, offsetSec) : `+${mmss(offsetSec)}`;
}

export const totalSec = (show: Show) => show.items.reduce((s, it) => s + (it.durSec ?? 0), 0);

export const powerTotal = (show: Show) => show.gear.reduce((s, g) => s + g.power, 0);

/** Channel numbers are the 1-based position in show.inputs. */
export function channelsByPart(show: Show): Map<string, number[]> {
  const map = new Map<string, number[]>();
  show.inputs.forEach((inp, i) => {
    const list = map.get(inp.partId) ?? [];
    list.push(i + 1);
    map.set(inp.partId, list);
  });
  return map;
}

/** "1–8" for a contiguous run, otherwise "9,12". */
export function channelLabel(nums: number[]): string {
  const contiguous = nums.every((n, i) => i === 0 || n === nums[i - 1] + 1);
  if (nums.length > 1 && contiguous) return `${nums[0]}–${nums[nums.length - 1]}`;
  return nums.join(",");
}

export function memberName(show: Show, memberId: string | null): string {
  return show.members.find((m) => m.id === memberId)?.name ?? "";
}

export function partLabel(show: Show, part: StagePart): { label: string; sub: string } {
  const m = show.members.find((mm) => mm.id === part.memberId);
  if (!m) return { label: part.label, sub: part.sub };
  if (part.type === "person") return { label: m.name, sub: m.part };
  return { label: `${part.label} ${m.name}`.trim(), sub: part.sub };
}

const TYPE_NAME: Record<StagePart["type"], string> = {
  riser: "ドラム台", drums: "ドラム", amp: "アンプ", person: "メンバー", mic: "マイク",
  box: "機材", power: "電源", wedge: "モニター", text: "テキスト",
};

/** Name for pickers: the drawn label, else the first input routed through the part, else its type. */
export function partDisplayName(show: Show, part: StagePart): string {
  const firstInput = show.inputs.find((i) => i.partId === part.id)?.name;
  return partLabel(show, part).label || (firstInput && `${TYPE_NAME[part.type]}（${firstInput}）`) || TYPE_NAME[part.type];
}

export const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

/** Accepts "m:ss", "m" or "" and returns seconds, null for empty, undefined for invalid. */
export function parseDuration(text: string): number | null | undefined {
  const t = text.trim();
  if (t === "") return null;
  const m = /^(\d{1,3})(?::([0-5]?\d))?$/.exec(t);
  if (!m) return undefined;
  return Number(m[1]) * 60 + Number(m[2] ?? 0);
}

const ja = new Intl.Collator("ja");

/**
 * Guests on the door list: everyone not cancelled, in 五十音 order of their reading (the name when no reading is
 * given), so that the venue can find a name quickly.
 */
export function doorList(show: Show): Reservation[] {
  return show.reservations
    .filter((r) => r.status !== "キャンセル")
    .sort((a, b) => ja.compare(a.kana || a.name, b.kana || b.name) || ja.compare(a.name, b.name));
}

type ReservationTotals = { tickets: number; guests: number; byMember: { name: string; tickets: number }[] };

/** Tickets on the door list, in total and per member (in member order, then 「担当なし」). */
export function reservationTotals(show: Show): ReservationTotals {
  const list = doorList(show);
  const byId = new Map<string | null, number>();
  for (const r of list) byId.set(r.memberId, (byId.get(r.memberId) ?? 0) + r.count);
  const byMember = [
    ...show.members.filter((m) => byId.has(m.id)).map((m) => ({ name: m.name || "（名前なし）", tickets: byId.get(m.id)! })),
    ...(byId.has(null) ? [{ name: "担当なし", tickets: byId.get(null)! }] : []),
  ];
  return { tickets: list.reduce((n, r) => n + r.count, 0), guests: list.length, byMember };
}

/** The door list as plain text for sending by mail or a form; columns follow the sheet's print options. */
export function reservationText(show: Show): string {
  const opt = show.print.reserve;
  const head = `【取り置き】${show.meta.band}（${[show.meta.date, show.meta.venue].filter(Boolean).join(" ")}）`;
  const lines = doorList(show).map((r) => {
    const parts = [opt.kana && r.kana ? `${r.name}（${r.kana}）` : r.name, `${r.count}枚`];
    if (opt.member && r.memberId) parts.push(`担当: ${memberName(show, r.memberId)}`);
    if (opt.note && r.note) parts.push(r.note);
    return parts.join(" ");
  });
  const { tickets, guests } = reservationTotals(show);
  return [head, ...lines, `計 ${tickets}枚（${guests}件）`].join("\n");
}

/** Start and end of a timetable row; the band's own set follows the start time and slot length in 基本情報. */
export function rowTimes(show: Show, row: TimetableRow): { start: string; end: string } {
  if (row.kind === "event") return { start: row.start, end: row.end };
  const start = show.meta.startTime;
  return { start, end: start && show.meta.slotSec > 0 ? clockAt(start, show.meta.slotSec) : "" };
}

/** Typical day at a live house, to start from; the band's own set is placed at its start time. */
export function timetableTemplate(newId: () => string): TimetableRow[] {
  const row = (start: string, title: string, end = ""): TimetableRow => ({ id: newId(), kind: "event", start, end, title, note: "" });
  return [
    row("", "入り"), row("", "リハーサル"), row("", "開場"), row("", "開演"),
    { id: newId(), kind: "ours", start: "", end: "", title: "", note: "" },
    row("", "終演"), row("", "撤収・精算"),
  ];
}
