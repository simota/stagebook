import type { PerformerOptions, PrintOptions, Show } from "../model/show";
import type { SheetId } from "../store/showStore";
import { useShowStore } from "../store/showStore";

type PrintGroup = Exclude<keyof PrintOptions, "header">;
type Toggle = { label: string; get: (s: Show) => boolean; set: (s: Show, v: boolean) => void };

const performer = (key: keyof PerformerOptions, label: string): Toggle => ({
  label, get: (s) => s.performer[key], set: (s, v) => { s.performer[key] = v; },
});
const print = <G extends PrintGroup>(group: G, key: keyof PrintOptions[G], label: string): Toggle => ({
  label,
  get: (s) => s.print[group][key] as boolean,
  set: (s, v) => { (s.print[group][key] as boolean) = v; },
});
const header = (key: keyof PrintOptions["header"], label: string): Toggle => ({
  label, get: (s) => s.print.header[key], set: (s, v) => { s.print.header[key] = v; },
});

/**
 * One label per option, in display order. The Record types make an option added to the schema without a
 * toggle here a type error, so no option can silently become impossible to turn off.
 */
const PERFORMER_LABELS: Record<Exclude<keyof PerformerOptions, "inverse">, string> = {
  showNumbers: "曲番号", showBpm: "BPM", showLink: "つなぎ", showNote: "注釈", showSe: "SE", showMc: "MC・転換・メモ",
};
const PRINT_LABELS: { [G in PrintGroup]: Record<keyof PrintOptions[G], string> } = {
  staff: { start: "開始 / 経過時刻", artist: "原曲", bpm: "BPM", key: "Key", dur: "尺", link: "つなぎ", note: "注釈", total: "合計時間" },
  stage: { plot: "ステージ図", channels: "チャンネル表", gear: "機材表", monitors: "返しの要望" },
  cue: {
    general: "全般の要望", start: "開始 / 経過時刻", colors: "照明の色", mood: "雰囲気", level: "明るさ", motion: "動き",
    cue: "きっかけ・特記", sound: "音響",
  },
  reserve: { kana: "よみがな", member: "担当メンバー", note: "備考" },
  timetable: { note: "備考" },
};
const HEADER_LABELS: Record<keyof PrintOptions["header"], string> = { event: "公演名", contact: "連絡先" };

const entries = <K extends string>(labels: Record<K, string>) => Object.entries(labels) as [K, string][];
const printToggles = <G extends PrintGroup>(group: G) =>
  entries(PRINT_LABELS[group] as Record<keyof PrintOptions[G] & string, string>).map(([k, label]) => print(group, k, label));

const SHEET_TOGGLES: Record<SheetId, Toggle[]> = {
  performer: entries(PERFORMER_LABELS).map(([k, label]) => performer(k, label)),
  staff: printToggles("staff"),
  stage: printToggles("stage"),
  cue: printToggles("cue"),
  timetable: printToggles("timetable"),
  reserve: printToggles("reserve"),
};

/** How the sheet looks rather than what it contains; not counted as shown items. */
const STYLE_TOGGLES: Partial<Record<SheetId, Toggle[]>> = {
  performer: [performer("inverse", "白黒反転（暗いステージ用）")],
};

const HEADER_TOGGLES = entries(HEADER_LABELS).map(([k, label]) => header(k, label));

export function PrintOptionsPanel({ sheet }: { sheet: SheetId }) {
  const show = useShowStore((s) => s.show);
  const update = useShowStore((s) => s.update);
  const toggles = SHEET_TOGGLES[sheet];
  const shown = toggles.filter((t) => t.get(show)).length;
  const styles = STYLE_TOGGLES[sheet];

  const row = (t: Toggle) => (
    <label key={t.label} className="check">
      <input type="checkbox" checked={t.get(show)} onChange={(e) => update((d) => t.set(d, e.target.checked))} /> {t.label}
    </label>
  );

  return (
    <details className="print-options">
      <summary>表示する項目 <span className="hint">（{shown} / {toggles.length} 項目を表示中）</span></summary>
      <fieldset>
        <legend>このシート</legend>
        {toggles.map(row)}
      </fieldset>
      {styles && (
        <fieldset>
          <legend>見た目</legend>
          {styles.map(row)}
        </fieldset>
      )}
      <fieldset>
        <legend>ヘッダー（全シート共通）</legend>
        {HEADER_TOGGLES.map(row)}
      </fieldset>
    </details>
  );
}
