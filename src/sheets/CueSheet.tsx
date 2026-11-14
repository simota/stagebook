import type { ReactNode } from "react";
import { itemStartLabel, mmss, songNumbers, startOffsets } from "../model/derive";
import { COLOR_INFO, KIND_LABEL } from "../model/labels";
import type { PrintOptions, SetItem, Show } from "../model/show";
import { Sheet, SheetHeader } from "./common";

type Column = { key: keyof PrintOptions["cue"] | null; head: string; className?: string; cell: (it: SetItem) => ReactNode };

export function CueSheet({ show }: { show: Show }) {
  const nos = songNumbers(show);
  const starts = startOffsets(show);
  const opt = show.print.cue;
  const timing = (it: SetItem) => [opt.start && itemStartLabel(show, starts.get(it.id)!), it.durSec != null && mmss(it.durSec)].filter(Boolean).join(" / ");
  const columns = ([
    { key: null, head: "#", className: "c", cell: (it) => (it.kind === "song" ? nos.get(it.id) : KIND_LABEL[it.kind]) },
    {
      key: null, head: "曲名",
      cell: (it) => <><b>{it.title}</b>{timing(it) && <><br /><span className="sub">{timing(it)}</span></>}</>,
    },
    {
      key: "colors", head: "照明の色",
      cell: (it) => it.light.colors.map((c) => (
        <span className="sw" key={c}><i style={{ background: COLOR_INFO[c].fill }} />{COLOR_INFO[c].name}</span>
      )),
    },
    { key: "mood", head: "雰囲気", cell: (it) => it.light.mood },
    { key: "level", head: "明るさ", className: "c", cell: (it) => it.light.level },
    { key: "motion", head: "動き", className: "c", cell: (it) => it.light.motion },
    { key: "cue", head: "きっかけ・特記（照明）", cell: (it) => it.light.cue },
    { key: "sound", head: "音響（コーラス / ソロ / 効果）", cell: (it) => it.sound },
  ] satisfies Column[]).filter((c) => c.key === null || opt[c.key]);

  return (
    <Sheet orientation="landscape">
      <SheetHeader show={show} doc="LIGHTING / SOUND CUE SHEET" />
      {opt.general && (
        <div className="general">
          <div><b>照明 全般</b>{show.general.light}</div>
          <div><b>音響 全般</b>{show.general.sound}</div>
          <div><b>SE・同期・クリック</b>{show.general.sync}</div>
        </div>
      )}
      <table className="c-table">
        <thead>
          <tr>{columns.map((c) => <th key={c.head} className={c.className}>{c.head}</th>)}</tr>
        </thead>
        <tbody>
          {show.items.map((it) =>
            it.kind === "encore" ? (
              <tr className="div" key={it.id}><td colSpan={columns.length}>{it.title}</td></tr>
            ) : (
              <tr className={`k-${it.kind}`} key={it.id}>
                {columns.map((c) => <td key={c.head} className={c.className}>{c.cell(it)}</td>)}
              </tr>
            ),
          )}
        </tbody>
      </table>
    </Sheet>
  );
}
