import { useRef, useState, type ReactNode } from "react";
import { clockAt, itemStartLabel, mmss, parseDuration, songNumbers, startOffsets, totalSec } from "../model/derive";
import { ITEM_KINDS, newItem, type ItemKind, type SetItem } from "../model/show";
import { KIND_LABEL } from "../model/labels";
import { useShowStore } from "../store/showStore";
import { LibraryPanel } from "./LibraryPanel";
import { SortableList } from "./SortableList";

export function SetlistEditor() {
  const show = useShowStore((s) => s.show);
  const update = useShowStore((s) => s.update);
  const nos = songNumbers(show);
  const starts = startOffsets(show);
  const total = totalSec(show);
  const over = show.meta.slotSec > 0 && total > show.meta.slotSec;
  const [libraryOpen, setLibraryOpen] = useState(false);
  const libraryButton = useRef<HTMLButtonElement>(null);
  const closeLibrary = () => {
    setLibraryOpen(false);
    libraryButton.current?.focus();
  };

  const edit = (id: string, patch: Partial<SetItem>) =>
    update((d) => { Object.assign(d.items.find((i) => i.id === id)!, patch); });
  const add = (kind: ItemKind) => update((d) => { d.items.push(newItem(kind)); });

  return (
    <div className="panel">
      <div className={`time-bar${over ? " over" : ""}`}>
        合計 {mmss(total)} / 持ち時間 {mmss(show.meta.slotSec)}
        {over && `（${mmss(total - show.meta.slotSec)} オーバー）`}
        {show.meta.startTime && `　${show.meta.startTime} 開始 → ${clockAt(show.meta.startTime, total)} 終了予定`}
      </div>
      <SortableList
        items={show.items}
        onReorder={(items) => update((d) => { d.items = items; })}
        renderItem={(it, _i, handle) => (
          <ItemRow item={it} no={nos.get(it.id)} handle={handle} start={itemStartLabel(show, starts.get(it.id)!)}
            onChange={(p) => edit(it.id, p)}
            onDelete={() => update((d) => { d.items = d.items.filter((x) => x.id !== it.id); })} />
        )}
      />
      <div className="add-bar">
        {ITEM_KINDS.map((k) => (
          <button type="button" key={k} onClick={() => add(k)}>＋ {KIND_LABEL[k]}</button>
        ))}
        <button type="button" ref={libraryButton} className="primary-outline" aria-expanded={libraryOpen} onClick={() => setLibraryOpen((o) => !o)}>
          ♫ 曲ライブラリから追加
        </button>
      </div>
      {libraryOpen && <LibraryPanel onClose={closeLibrary} />}
    </div>
  );
}

function ItemRow({ item, no, handle, start, onChange, onDelete }: {
  item: SetItem; no?: number; handle: ReactNode; start: string;
  onChange: (p: Partial<SetItem>) => void; onDelete: () => void;
}) {
  const song = item.kind === "song";
  return (
    <div className={`item-row k-${item.kind}`}>
      <div className="line">
        {handle}
        <span className="no">{no ?? KIND_LABEL[item.kind]}</span>
        <select value={item.kind} onChange={(e) => onChange({ kind: e.target.value as ItemKind })} aria-label="種別">
          {ITEM_KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
        </select>
        <input className="grow strong" value={item.title} placeholder={song ? "曲名" : "タイトル"}
          onChange={(e) => onChange({ title: e.target.value })} aria-label="曲名" />
        {item.kind !== "encore" && <span className="start" title="開始時刻（開始時刻が未設定なら経過時間）">{start}</span>}
        {item.kind !== "encore" && <DurationInput value={item.durSec} onChange={(durSec) => onChange({ durSec })} />}
        <button type="button" className="icon danger" onClick={onDelete} aria-label={`${no ?? KIND_LABEL[item.kind]} ${item.title || "（無題）"} を削除`}>×</button>
      </div>
      {song && (
        <div className="line sub">
          <input className="grow" value={item.artist} placeholder="原曲（空欄ならオリジナル）" aria-label="原曲アーティスト"
            onChange={(e) => onChange({ artist: e.target.value })} />
          <input className="num" inputMode="numeric" value={item.bpm ?? ""} placeholder="BPM" aria-label="BPM"
            onChange={(e) => {
              const n = Number.parseInt(e.target.value, 10);
              onChange({ bpm: Number.isFinite(n) && n > 0 ? n : null });
            }} />
          <input className="key" value={item.key} placeholder="Key" aria-label="キー" onChange={(e) => onChange({ key: e.target.value })} />
          <input className="link" value={item.link} placeholder="つなぎ" list="link-options" aria-label="つなぎ"
            onChange={(e) => onChange({ link: e.target.value })} />
        </div>
      )}
      {item.kind !== "encore" && (
        <div className="line sub">
          <input className="grow" value={item.note} placeholder={song ? "注釈（カウント、ソロ、構成など）" : "メモ"} aria-label={song ? "注釈" : "メモ"}
            onChange={(e) => onChange({ note: e.target.value })} />
          {item.kind === "se" && (
            <input className="link" value={item.link} placeholder="つなぎ" list="link-options" aria-label="つなぎ"
              onChange={(e) => onChange({ link: e.target.value })} />
          )}
        </div>
      )}
    </div>
  );
}

const durationText = (sec: number | null) => (sec == null ? "" : mmss(sec));

/**
 * Keeps the raw text while typing so that "3:" is not rejected mid-entry. When the value changes from outside
 * (undo, redo) the text follows it; while typing, the value already matches what the text means.
 */
function DurationInput({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const [text, setText] = useState(durationText(value));
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    if (parseDuration(text) !== value) setText(durationText(value));
  }
  const parsed = parseDuration(text);
  return (
    <input className={`dur${parsed === undefined ? " invalid" : ""}`} value={text} placeholder="尺 m:ss" aria-label="尺"
      onChange={(e) => {
        setText(e.target.value);
        const v = parseDuration(e.target.value);
        if (v !== undefined) onChange(v);
      }}
      onBlur={() => setText(durationText(value))} />
  );
}
