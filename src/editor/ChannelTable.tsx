import { partDisplayName } from "../model/derive";
import { newId, type Input } from "../model/show";
import { useShowStore } from "../store/showStore";
import { SortableList } from "./SortableList";

const STANDS = ["", "ショート", "ブーム", "ストレート", "クリップ"];

/** The input list: row order is the channel number; rows of the selected stage part are highlighted. */
export function ChannelTable() {
  const show = useShowStore((s) => s.show);
  const update = useShowStore((s) => s.update);
  const selectedId = useShowStore((s) => s.selectedPartId);
  // Every row offers every part; name them once per render rather than once per row.
  const partOptions = show.stageParts.map((p) => <option key={p.id} value={p.id}>{partDisplayName(show, p)}</option>);
  const edit = (id: string, patch: Partial<Input>) =>
    update((d) => { Object.assign(d.inputs.find((i) => i.id === id)!, patch); });
  const addInput = () => update((d) => {
    d.inputs.push({ id: newId(), partId: selectedId ?? "", name: "", mic: "", stand: "", phantom: false, own: false, note: "" });
  });
  return (
    <div className="channels">
      <h2>チャンネル表 <small>上から順に CH1, 2, … と振られます。ドラッグで並べ替え</small></h2>
      <div className="ch-head">
        <span /><span>CH</span><span>楽器</span><span>マイク / DI</span><span>スタンド</span><span>48V</span><span>持込</span><span>備考</span><span>図のパーツ</span><span />
      </div>
      <SortableList
        items={show.inputs}
        onReorder={(inputs) => update((d) => { d.inputs = inputs; })}
        renderItem={(c, i, handle) => (
          <div className={`ch-row${c.partId && c.partId === selectedId ? " hl" : ""}`}>
            {handle}
            <span className="no">{i + 1}</span>
            <input value={c.name} placeholder="楽器" aria-label={`CH${i + 1} 楽器`} onChange={(e) => edit(c.id, { name: e.target.value })} />
            <input value={c.mic} placeholder="SM58（会場）" list="mic-options" aria-label={`CH${i + 1} マイク / DI`} onChange={(e) => edit(c.id, { mic: e.target.value })} />
            <select value={c.stand} aria-label={`CH${i + 1} スタンド`} onChange={(e) => edit(c.id, { stand: e.target.value })}>
              {STANDS.map((s) => <option key={s} value={s}>{s || "—"}</option>)}
            </select>
            <input type="checkbox" checked={c.phantom} onChange={(e) => edit(c.id, { phantom: e.target.checked })} aria-label={`CH${i + 1} 48V`} />
            <input type="checkbox" checked={c.own} onChange={(e) => edit(c.id, { own: e.target.checked })} aria-label={`CH${i + 1} 持込`} />
            <input value={c.note} placeholder="備考" aria-label={`CH${i + 1} 備考`} onChange={(e) => edit(c.id, { note: e.target.value })} />
            <select value={c.partId} aria-label={`CH${i + 1} 図のパーツ`} onChange={(e) => edit(c.id, { partId: e.target.value })}>
              <option value="">（図に表示しない）</option>
              {partOptions}
            </select>
            <button type="button" className="icon danger" aria-label={`CH${i + 1} を削除`}
              onClick={() => update((d) => { d.inputs = d.inputs.filter((x) => x.id !== c.id); })}>×</button>
          </div>
        )}
      />
      <div className="add-bar"><button type="button" onClick={addInput}>＋ 入力を追加{selectedId ? "（選択中のパーツに）" : ""}</button></div>
    </div>
  );
}
