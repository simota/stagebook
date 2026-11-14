import { rowTimes, timetableTemplate } from "../model/derive";
import { newId, type TimetableRow } from "../model/show";
import { useShowStore } from "../store/showStore";
import { SortableList } from "./SortableList";

export function TimetableEditor() {
  const show = useShowStore((s) => s.show);
  const update = useShowStore((s) => s.update);
  const setTab = useShowStore((s) => s.setTab);
  const edit = (id: string, p: Partial<TimetableRow>) => update((d) => { Object.assign(d.timetable.find((r) => r.id === id)!, p); });
  const hasOurs = show.timetable.some((r) => r.kind === "ours");
  const add = (kind: TimetableRow["kind"]) =>
    update((d) => { d.timetable.push({ id: newId(), kind, start: "", end: "", title: "", note: "" }); });

  return (
    <div className="panel">
      <p className="hint">
        入りから撤収までの当日の流れです。上から順に印刷されます（ドラッグで並べ替え）。「自分たちの出番」の時刻は、基本情報の開始時刻と持ち時間から自動で入ります。
      </p>
      <SortableList
        items={show.timetable}
        onReorder={(rows) => update((d) => { d.timetable = rows; })}
        renderItem={(r, i, handle) => {
          const label = r.kind === "ours" ? "自分たちの出番" : r.title || `行${i + 1}`;
          return (
            <div className={`line timetable-row${r.kind === "ours" ? " ours" : ""}`}>
              {handle}
              {r.kind === "ours" ? <OursTimes times={rowTimes(show, r)} onOpenInfo={() => setTab("info")} /> : (
                <>
                  <input type="time" className="time" value={r.start} aria-label={`${label} 開始`} onChange={(e) => edit(r.id, { start: e.target.value })} />
                  〜
                  <input type="time" className="time" value={r.end} aria-label={`${label} 終了`} onChange={(e) => edit(r.id, { end: e.target.value })} />
                  <input className="grow" value={r.title} placeholder="内容（入り・リハ・開場・〇組目 など）" aria-label={`行${i + 1} 内容`}
                    onChange={(e) => edit(r.id, { title: e.target.value })} />
                </>
              )}
              <input className="grow" value={r.note} placeholder="備考" aria-label={`${label} 備考`} onChange={(e) => edit(r.id, { note: e.target.value })} />
              <button type="button" className="icon danger" aria-label={`${label} を削除`}
                onClick={() => update((d) => { d.timetable = d.timetable.filter((x) => x.id !== r.id); })}>×</button>
            </div>
          );
        }}
      />
      <div className="add-bar">
        <button type="button" onClick={() => add("event")}>＋ 行</button>
        <button type="button" onClick={() => add("ours")} disabled={hasOurs}>＋ 自分たちの出番</button>
        {show.timetable.length === 0 && (
          <button type="button" className="primary-outline" onClick={() => update((d) => { d.timetable = timetableTemplate(newId); })}>
            よくある流れから作る
          </button>
        )}
      </div>
    </div>
  );
}

function OursTimes({ times, onOpenInfo }: { times: { start: string; end: string }; onOpenInfo: () => void }) {
  return (
    <span className="ours-times">
      <b>自分たちの出番</b>{" "}
      {times.start ? `${times.start}${times.end ? `〜${times.end}` : ""}` : (
        <>開始時刻が未設定です <button type="button" className="link" onClick={onOpenInfo}>基本情報で入れる</button></>
      )}
    </span>
  );
}
