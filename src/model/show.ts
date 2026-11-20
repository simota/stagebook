import { z } from "zod";
import { SHEET_FONT_IDS } from "./fonts";

// The built page's CSP forbids eval (vite.config.ts). Without this, zod probes `new Function` on first parse, which
// the browser reports as a CSP violation; parsing speed is the same either way (~14µs per show).
z.config({ jitless: true });

export const ITEM_KINDS = ["song", "se", "mc", "change", "encore", "memo"] as const;
export const LIGHT_COLORS = ["red", "orange", "yellow", "green", "blue", "purple", "white", "auto"] as const;
export const LIGHT_LEVELS = ["", "暗", "中", "明"] as const;
export const LIGHT_MOTIONS = ["", "なし", "ゆっくり", "速い", "曲に合わせる"] as const;
const PART_TYPES = ["riser", "drums", "amp", "person", "mic", "box", "power", "wedge", "text"] as const;
export const GEAR_OWNERSHIP = ["持込", "借用"] as const;
export const MAX_BLANK_ROWS = 100;
export const RESERVATION_STATUS = ["予約", "来場", "キャンセル"] as const;

export const TIME_RE = /^$|^([01]\d|2[0-3]):[0-5]\d$/;

export const STAGE_W = 160;
export const STAGE_D = 44;

const id = z.string().min(1);

/** Print toggles were added after v1 shipped: missing ones default to shown, so older data prints as before. */
const on = z.boolean().default(true);

const member = z.object({ id, name: z.string(), part: z.string() });

const light = z.object({
  colors: z.array(z.enum(LIGHT_COLORS)).max(3),
  mood: z.string(),
  level: z.enum(LIGHT_LEVELS),
  motion: z.enum(LIGHT_MOTIONS),
  cue: z.string(),
});

const setItem = z.object({
  id,
  kind: z.enum(ITEM_KINDS),
  title: z.string(),
  artist: z.string(),
  bpm: z.number().int().positive().nullable(),
  key: z.string(),
  durSec: z.number().int().nonnegative().nullable(),
  link: z.string(),
  note: z.string(),
  light,
  sound: z.string(),
});

const stagePart = z.object({
  id,
  type: z.enum(PART_TYPES),
  x: z.number().min(0).max(STAGE_W),
  y: z.number().min(0).max(STAGE_D),
  w: z.number().positive(),
  h: z.number().positive(),
  rot: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]),
  label: z.string(),
  sub: z.string(),
  memberId: z.string().nullable(),
});

const input = z.object({
  id,
  partId: z.string(),
  name: z.string(),
  mic: z.string(),
  stand: z.string(),
  phantom: z.boolean(),
  own: z.boolean(),
  note: z.string(),
});

const gearRow = z.object({
  id,
  memberId: z.string().nullable(),
  item: z.string(),
  own: z.enum(GEAR_OWNERSHIP),
  power: z.number().int().nonnegative(),
  note: z.string(),
});

/**
 * One line of the day's schedule. `ours` is the band's own set: its times come from `meta.startTime` and
 * `meta.slotSec` rather than being stored twice, so changing the start time moves it too.
 */
const timetableRow = z.object({
  id,
  kind: z.enum(["event", "ours"]),
  start: z.string().regex(TIME_RE),
  end: z.string().regex(TIME_RE),
  title: z.string(),
  note: z.string(),
});

/** A ticket held at the door for a guest of the band. Names are third-party personal data (see share.ts). */
const reservation = z.object({
  id,
  name: z.string(),
  /** Reading in kana, for sorting the submitted list in 五十音 order; kanji alone do not sort by reading. */
  kana: z.string(),
  /** null when the number of tickets is not known yet; the sheet leaves the cell blank to fill in by hand. */
  count: z.number().int().positive().nullable(),
  memberId: z.string().nullable(),
  status: z.enum(RESERVATION_STATUS),
  note: z.string(),
});

const monitorReq = z.object({
  id,
  memberId: z.string().nullable(),
  wedgePartId: z.string().nullable(),
  req: z.string(),
});

const showSchema = z.object({
  schemaVersion: z.literal(1),
  id,
  meta: z.object({
    band: z.string(),
    event: z.string(),
    venue: z.string(),
    date: z.string(),
    slot: z.string(),
    slotSec: z.number().int().nonnegative(),
    contact: z.string(),
    /** "HH:MM" or ""; added after v1 shipped, so older data without it defaults to "". */
    startTime: z.string().regex(TIME_RE).default(""),
  }),
  performer: z.object({
    inverse: z.boolean(),
    showBpm: z.boolean(),
    showNote: z.boolean(),
    showNumbers: on,
    showLink: on,
    showSe: on,
    showMc: on,
  }),
  print: z.object({
    header: z.object({ event: on, contact: on }).prefault({}),
    staff: z.object({ start: on, artist: on, bpm: on, key: on, dur: on, link: on, note: on, total: on }).prefault({}),
    stage: z.object({ plot: on, channels: on, gear: on, monitors: on }).prefault({}),
    cue: z.object({ general: on, start: on, colors: on, mood: on, level: on, motion: on, cue: on, sound: on }).prefault({}),
    reserve: z.object({ kana: on, member: on, note: on }).prefault({}),
    timetable: z.object({ note: on }).prefault({}),
  }).prefault({}),
  /**
   * Typeface of the printed sheets. Added after v1 shipped: missing means the device font as before, and an id this
   * build does not know (from a newer version) also falls back to it rather than making the whole show unreadable.
   */
  font: z.enum(SHEET_FONT_IDS).catch("system"),
  members: z.array(member),
  items: z.array(setItem),
  stageParts: z.array(stagePart),
  inputs: z.array(input),
  gear: z.array(gearRow),
  monitors: z.array(monitorReq),
  /** The whole day (load-in, rehearsal, doors, every act), in the order entered. Added after v1 shipped. */
  timetable: z.array(timetableRow).default([]),
  /** Added after v1 shipped: older data has no reservations. */
  reservations: z.array(reservation).default([]),
  /** Empty rows printed after the door list, for guests written in by hand. Added after v1 shipped. */
  reservationBlankRows: z.number().int().min(0).max(MAX_BLANK_ROWS).default(0),
  general: z.object({ light: z.string(), sound: z.string(), sync: z.string() }),
});

export type Show = z.infer<typeof showSchema>;
export type SetItem = Show["items"][number];
export type ItemKind = SetItem["kind"];
export type Light = SetItem["light"];
export type LightColor = Light["colors"][number];
export type StagePart = Show["stageParts"][number];
export type PartType = StagePart["type"];
export type Input = Show["inputs"][number];
export type GearRow = Show["gear"][number];
export type MonitorReq = Show["monitors"][number];
export type Reservation = Show["reservations"][number];
export type TimetableRow = Show["timetable"][number];

export type PrintOptions = Show["print"];
export type PerformerOptions = Show["performer"];

export const defaultPrint = (): PrintOptions => showSchema.shape.print.parse(undefined);

export type ParseResult = { ok: true; show: Show } | { ok: false; error: string };

export function parseShow(data: unknown): ParseResult {
  if (typeof data !== "object" || data === null || !("schemaVersion" in data)) {
    return { ok: false, error: "このアプリで書き出した公演データではありません" };
  }
  if (data.schemaVersion !== 1) {
    return { ok: false, error: `対応していないデータ形式です（schemaVersion: ${String(data.schemaVersion)}）` };
  }
  const r = showSchema.safeParse(data);
  if (r.success) return { ok: true, show: dropDanglingRefs(r.data) };
  const issue = r.error.issues[0];
  return { ok: false, error: `${issue.path.join(".") || "(root)"}: ${issue.message}` };
}

/**
 * Imported or hand-edited data can point at stage parts or members that do not exist. Those links are cut, the
 * same as when the app deletes a part or member: the sheets already print them as unlinked, and the editor's
 * pickers would otherwise show a choice that is not the stored one.
 */
function dropDanglingRefs(show: Show): Show {
  const parts = new Set(show.stageParts.map((p) => p.id));
  const members = new Set(show.members.map((m) => m.id));
  const member = (id: string | null) => (id !== null && members.has(id) ? id : null);
  const part = (id: string | null) => (id !== null && parts.has(id) ? id : null);
  return {
    ...show,
    stageParts: show.stageParts.map((p) => ({ ...p, memberId: member(p.memberId) })),
    inputs: show.inputs.map((i) => ({ ...i, partId: part(i.partId) ?? "" })),
    gear: show.gear.map((g) => ({ ...g, memberId: member(g.memberId) })),
    monitors: show.monitors.map((m) => ({ ...m, memberId: member(m.memberId), wedgePartId: part(m.wedgePartId) })),
    reservations: show.reservations.map((r) => ({ ...r, memberId: member(r.memberId) })),
  };
}

export const newId = () => crypto.randomUUID();

function emptyLight(): Light {
  return { colors: [], mood: "", level: "", motion: "", cue: "" };
}

export function newItem(kind: ItemKind): SetItem {
  const title = { song: "", se: "SE", mc: "MC", change: "転換", encore: "ENCORE", memo: "" }[kind];
  return {
    id: newId(), kind, title, artist: "", bpm: null, key: "", durSec: null,
    link: "", note: "", light: emptyLight(), sound: "",
  };
}

export function emptyShow(): Show {
  return {
    schemaVersion: 1,
    id: newId(),
    meta: { band: "新しいバンド", event: "", venue: "", date: "", slot: "", slotSec: 30 * 60, contact: "", startTime: "" },
    performer: { inverse: false, showBpm: true, showNote: true, showNumbers: true, showLink: true, showSe: true, showMc: true },
    print: defaultPrint(),
    font: "system",
    members: [],
    items: [],
    stageParts: [],
    inputs: [],
    gear: [],
    monitors: [],
    timetable: [],
    reservations: [],
    reservationBlankRows: 0,
    general: { light: "", sound: "", sync: "" },
  };
}
