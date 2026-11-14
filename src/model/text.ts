import { mmss, parseDuration } from "./derive";
import { COLOR_INFO, KIND_LABEL } from "./labels";
import {
  LIGHT_LEVELS, LIGHT_MOTIONS, TIME_RE, newItem,
  type ItemKind, type Light, type LightColor, type SetItem, type Show,
} from "./show";

const META_KEYS = { 公演: "event", 会場: "venue", 日付: "date", 出番: "slot", 連絡先: "contact" } as const;
const START_KEY = "開始";
const SLOT_MINUTES_KEY = "持ち時間";
const GENERAL_KEYS = { 照明: "light", 音響: "sound", 同期: "sync" } as const;
const PREFIXED_KINDS: ItemKind[] = ["se", "mc", "change", "memo"];
const PREFIX_KIND = Object.fromEntries(PREFIXED_KINDS.map((k) => [KIND_LABEL[k], k])) as Record<string, ItemKind>;
const SECTION_SETLIST = "セットリスト";
const SECTION_GENERAL = "全般";

const COLOR_BY_NAME = Object.fromEntries(
  (Object.keys(COLOR_INFO) as LightColor[]).map((c) => [COLOR_INFO[c].name, c]),
) as Record<string, LightColor>;

const DUR_RE = /^\d{1,3}:[0-5]\d$/;
const BPM_RE = /^\d{2,3}$/;
const KEY_RE = /^[A-G](#|b|♯|♭)?(m|min|maj|M)?$/;
const ENCORE_RE = /^-{3,}\s*(.*?)\s*-*$/;
const SONG_RE = /^(?:\d+[.)．]|[-*・])\s*(.*)$/;

export function serializeShowText(show: Show): string {
  const out: string[] = [`# ${show.meta.band}`];
  for (const [label, key] of Object.entries(META_KEYS)) out.push(`${label}: ${show.meta[key]}`);
  out.push(`${SLOT_MINUTES_KEY}: ${show.meta.slotSec / 60}`);
  if (show.meta.startTime) out.push(`${START_KEY}: ${show.meta.startTime}`);
  out.push("", `## ${SECTION_SETLIST}`);

  let songNo = 0;
  for (const it of show.items) {
    if (it.kind === "encore") {
      out.push(`--- ${it.title} ---`);
      continue;
    }
    const head = it.kind === "song" ? `${++songNo}. ${it.title}` : `${KIND_LABEL[it.kind]}: ${it.title}`;
    const inline = [it.bpm ?? "", it.key, it.durSec != null ? mmss(it.durSec) : "", it.link].filter((v) => v !== "");
    out.push([head, ...inline].join(" | "));
    if (it.note) out.push(`  > ${it.note}`);
    if (it.artist) out.push(`  原曲: ${it.artist}`);
    const l = it.light;
    if (l.colors.length || l.mood || l.level || l.motion || l.cue) {
      out.push(`  照明: ${[l.colors.map((c) => COLOR_INFO[c].name).join(" "), l.mood, l.level, l.motion, l.cue].join(" / ")}`);
    }
    if (it.sound) out.push(`  音響: ${it.sound}`);
  }

  out.push("", `## ${SECTION_GENERAL}`);
  for (const [label, key] of Object.entries(GENERAL_KEYS)) {
    const [first, ...rest] = show.general[key].split("\n");
    out.push(`${label}: ${first}`, ...rest.map((r) => `  ${r}`));
  }
  return out.join("\n") + "\n";
}

export type TextError = { line: number; message: string };
type TextParseResult = { ok: true; show: Show } | { ok: false; errors: TextError[] };

/** Rebuilds header, setlist and general requests from text; every other part of `base` is kept. */
export function parseShowText(text: string, base: Show): TextParseResult {
  const meta: Show["meta"] = { band: "", event: "", venue: "", date: "", slot: "", slotSec: 0, contact: "", startTime: "" };
  const general: Show["general"] = { light: "", sound: "", sync: "" };
  const items: SetItem[] = [];
  const errors: TextError[] = [];
  let section: "header" | "setlist" | "general" = "header";
  let lastGeneral: keyof Show["general"] | null = null;

  text.split(/\r?\n/).forEach((raw, i) => {
    const line = i + 1;
    const err = (message: string) => errors.push({ line, message });
    if (raw.trim() === "") return;
    const indented = /^\s/.test(raw);
    const t = raw.trim();

    const h2 = /^##\s*(.*)$/.exec(t);
    if (!indented && h2) {
      if (h2[1] === SECTION_SETLIST) section = "setlist";
      else if (h2[1] === SECTION_GENERAL) section = "general";
      else err(`知らない見出しです: 「${h2[1]}」（使えるのは「${SECTION_SETLIST}」「${SECTION_GENERAL}」）`);
      return;
    }

    if (section === "header") {
      const h1 = /^#\s*(.*)$/.exec(t);
      if (h1) return void (meta.band = h1[1]);
      const kv = splitKey(t);
      if (kv && kv[0] in META_KEYS) return void (meta[META_KEYS[kv[0] as keyof typeof META_KEYS]] = kv[1]);
      if (kv && kv[0] === SLOT_MINUTES_KEY) {
        const min = Number(kv[1] || 0);
        if (Number.isFinite(min) && min >= 0) return void (meta.slotSec = Math.round(min * 60));
        return err(`持ち時間は分の数で書いてください: 「${kv[1]}」`);
      }
      if (kv && kv[0] === START_KEY) {
        const time = kv[1].replace(/^(\d):/, "0$1:");
        if (TIME_RE.test(time)) return void (meta.startTime = time);
        return err(`開始は「19:30」のように書いてください: 「${kv[1]}」`);
      }
      return err(`読めない行です。「# バンド名」か「${[...Object.keys(META_KEYS), SLOT_MINUTES_KEY, START_KEY].join("・")}: 値」で書いてください`);
    }

    if (section === "general") {
      const kv = indented ? null : splitKey(t);
      if (kv && kv[0] in GENERAL_KEYS) {
        lastGeneral = GENERAL_KEYS[kv[0] as keyof typeof GENERAL_KEYS];
        general[lastGeneral] = kv[1];
        return;
      }
      if (indented && lastGeneral) return void (general[lastGeneral] += `\n${t}`);
      return err(`「${Object.keys(GENERAL_KEYS).join("・")}: 内容」で書いてください`);
    }

    if (indented) {
      const it = items[items.length - 1];
      if (!it) return err("項目の前に字下げした行があります");
      return applyAttribute(it, t, err);
    }
    items.push(parseItemLine(t));
  });

  if (errors.length) return { ok: false, errors };
  return { ok: true, show: { ...base, meta, items, general } };
}

function splitKey(t: string): [string, string] | null {
  const m = /^([^:：]+)[:：]\s*(.*)$/.exec(t);
  return m ? [m[1].trim(), m[2].trim()] : null;
}

/** Any other line is a song title, so a plain list of titles pasted from notes works as is. */
function parseItemLine(t: string): SetItem {
  const encore = ENCORE_RE.exec(t);
  if (encore) return { ...newItem("encore"), title: encore[1] || "ENCORE" };

  let kind: ItemKind;
  let rest: string;
  const song = SONG_RE.exec(t);
  const kv = splitKey(t);
  if (song) {
    kind = "song";
    rest = song[1];
  } else if (kv && kv[0] in PREFIX_KIND) {
    kind = PREFIX_KIND[kv[0]];
    rest = kv[1];
  } else {
    kind = "song";
    rest = t;
  }

  const [title, ...tokens] = rest.split("|").map((s) => s.trim());
  const it: SetItem = { ...newItem(kind), title };
  for (const tok of tokens) {
    if (tok === "") continue;
    if (DUR_RE.test(tok)) it.durSec = parseDuration(tok)!;
    else if (BPM_RE.test(tok)) it.bpm = Number(tok);
    else if (KEY_RE.test(tok)) it.key = tok;
    else it.link = tok;
  }
  return it;
}

function applyAttribute(it: SetItem, t: string, err: (m: string) => void) {
  if (t.startsWith(">")) return void (it.note = t.slice(1).trim());
  const kv = splitKey(t);
  if (!kv) return err("「> 注釈」か「キー: 値」で書いてください");
  const [key, value] = kv;
  switch (key) {
    case "注釈": it.note = value; return;
    case "原曲": it.artist = value; return;
    case "つなぎ": it.link = value; return;
    case "音響": it.sound = value; return;
    case "BPM": case "bpm": {
      if (!BPM_RE.test(value)) return err(`BPMは数字で書いてください: 「${value}」`);
      it.bpm = Number(value);
      return;
    }
    case "キー": case "Key": case "key": it.key = value; return;
    case "尺": {
      const d = parseDuration(value);
      if (d === undefined) return err(`尺は「分:秒」で書いてください: 「${value}」`);
      it.durSec = d;
      return;
    }
    case "照明": {
      const light = parseLight(value, err);
      if (light) it.light = light;
      return;
    }
    default:
      err(`知らない項目名です: 「${key}」（使えるのは 注釈・原曲・つなぎ・BPM・キー・尺・照明・音響）`);
  }
}

/** "色 / 雰囲気 / 明るさ / 動き / きっかけ"; the cue is last so that it may itself contain "/". */
function parseLight(value: string, err: (m: string) => void): Light | null {
  const parts = value.split("/");
  const [colorText = "", mood = "", level = "", motion = ""] = parts.slice(0, 4).map((s) => s.trim());
  const cue = parts.slice(4).join("/").trim();
  const colors: LightColor[] = [];
  for (const name of colorText.split(/\s+/).filter(Boolean)) {
    const c = COLOR_BY_NAME[name];
    if (!c) {
      err(`照明の色が読めません: 「${name}」（${Object.keys(COLOR_BY_NAME).join(" ")}）`);
      return null;
    }
    if (!colors.includes(c)) colors.push(c);
  }
  if (colors.length > 3) {
    err("照明の色は3つまでです");
    return null;
  }
  if (!isOneOf(LIGHT_LEVELS, level)) {
    err(`明るさは ${LIGHT_LEVELS.filter(Boolean).join("・")} のどれかです: 「${level}」`);
    return null;
  }
  if (!isOneOf(LIGHT_MOTIONS, motion)) {
    err(`動きは ${LIGHT_MOTIONS.filter(Boolean).join("・")} のどれかです: 「${motion}」`);
    return null;
  }
  return { colors, mood, level, motion, cue };
}

const isOneOf = <T extends string>(list: readonly T[], v: string): v is T => (list as readonly string[]).includes(v);
