import type { ReactNode } from "react";
import { clockAt, itemStartLabel, mmss, songNumbers, startOffsets, totalSec } from "../model/derive";
import { KIND_LABEL } from "../model/labels";
import type { PrintOptions, SetItem, Show } from "../model/show";
import { Sheet, SheetHeader } from "./common";

type Column = { key: keyof PrintOptions["staff"] | null; head: string; className?: string; cell: (it: SetItem) => ReactNode };

export function StaffSetlist({ show }: { show: Show }) {
  const nos = songNumbers(show);
  const starts = startOffsets(show);
  const total = totalSec(show);
  const opt = show.print.staff;
  const song = (it: SetItem) => it.kind === "song";
  const columns = ([
    { key: null, head: "#", className: "c", cell: (it) => (song(it) ? nos.get(it.id) : KIND_LABEL[it.kind]) },
    { key: null, head: "種別", className: "c", cell: (it) => KIND_LABEL[it.kind] },
    { key: "start", head: show.meta.startTime ? "開始" : "経過", className: "n", cell: (it) => itemStartLabel(show, starts.get(it.id)!) },
    { key: null, head: "曲名", cell: (it) => <b>{it.title}</b> },
    { key: "artist", head: "原曲", cell: (it) => (song(it) ? it.artist || "オリジナル" : "—") },
    { key: "bpm", head: "BPM", className: "n", cell: (it) => it.bpm ?? "—" },
    { key: "key", head: "Key", className: "c", cell: (it) => it.key || "—" },
    { key: "dur", head: "尺", className: "n", cell: (it) => (it.durSec != null ? mmss(it.durSec) : "") },
    { key: "link", head: "つなぎ", cell: (it) => it.link },
    { key: "note", head: "注釈", cell: (it) => it.note },
  ] satisfies Column[]).filter((c) => c.key === null || opt[c.key]);

  return (
    <Sheet orientation="portrait">
      <SheetHeader show={show} doc="SETLIST（スタッフ用）" />
      <table className="staff-table">
        <thead>
          <tr>{columns.map((c) => <th key={c.head} className={c.className === "c" ? "c" : undefined}>{c.head}</th>)}</tr>
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
      {opt.total && (
        <div className="tot">
          合計 <b>{mmss(total)}</b>（持ち時間 {mmss(show.meta.slotSec)}）
          {show.meta.startTime && <>　終了予定 <b>{clockAt(show.meta.startTime, total)}</b></>}
        </div>
      )}
    </Sheet>
  );
}
