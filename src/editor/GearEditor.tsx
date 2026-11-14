import { powerTotal } from "../model/derive";
import { GEAR_OWNERSHIP, newId, type GearRow, type MonitorReq } from "../model/show";
import { useShowStore } from "../store/showStore";
import { SortableList } from "./SortableList";

export function GearEditor() {
  const show = useShowStore((s) => s.show);
  const update = useShowStore((s) => s.update);
  const editGear = (id: string, p: Partial<GearRow>) => update((d) => { Object.assign(d.gear.find((g) => g.id === id)!, p); });
  const editMon = (id: string, p: Partial<MonitorReq>) => update((d) => { Object.assign(d.monitors.find((m) => m.id === id)!, p); });
  const wedges = show.stageParts.filter((p) => p.type === "wedge");
  const memberSelect = (value: string | null, onChange: (v: string | null) => void, emptyLabel: string, label: string) => (
    <select value={value ?? ""} aria-label={label} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">{emptyLabel}</option>
      {show.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
    </select>
  );

  return (
    <div className="panel">
      <h2>機材表 <small>電源が必要な機材 合計 {powerTotal(show)}口</small></h2>
      <SortableList
        items={show.gear}
        onReorder={(gear) => update((d) => { d.gear = gear; })}
        renderItem={(g, i, handle) => (
          <div className="line gear-row">
            {handle}
            {memberSelect(g.memberId, (memberId) => editGear(g.id, { memberId }), "共通", `機材${i + 1} 担当`)}
            <input className="grow" value={g.item} placeholder="機材" aria-label={`機材${i + 1} 名前`} onChange={(e) => editGear(g.id, { item: e.target.value })} />
            <select value={g.own} aria-label={`機材${i + 1} 持込/借用`} onChange={(e) => editGear(g.id, { own: e.target.value as GearRow["own"] })}>
              {GEAR_OWNERSHIP.map((o) => <option key={o}>{o}</option>)}
            </select>
            <label className="inline">電源<input className="num" type="number" min={0} value={g.power}
              onChange={(e) => editGear(g.id, { power: Math.max(0, Math.round(Number(e.target.value))) })} /></label>
            <input className="note" value={g.note} placeholder="備考" aria-label={`機材${i + 1} 備考`} onChange={(e) => editGear(g.id, { note: e.target.value })} />
            <button type="button" className="icon danger"
              aria-label={`機材${i + 1} を削除`}
              onClick={() => update((d) => { d.gear = d.gear.filter((x) => x.id !== g.id); })}>×</button>
          </div>
        )}
      />
      <div className="add-bar">
        <button type="button" onClick={() => update((d) => {
          d.gear.push({ id: newId(), memberId: null, item: "", own: "持込", power: 0, note: "" });
        })}>＋ 機材</button>
      </div>

      <h2>返し（モニター）の要望</h2>
      {show.monitors.map((m, i) => (
        <div className="line" key={m.id}>
          {memberSelect(m.memberId, (memberId) => editMon(m.id, { memberId }), "（メンバー）", `要望${i + 1} メンバー`)}
          <select value={m.wedgePartId ?? ""} aria-label={`要望${i + 1} モニター`} onChange={(e) => editMon(m.id, { wedgePartId: e.target.value || null })}>
            <option value="">（モニター）</option>
            {wedges.map((w) => <option key={w.id} value={w.id}>{w.label}</option>)}
          </select>
          <input className="grow" value={m.req} placeholder="Vo多め / Kick など" aria-label={`要望${i + 1} 内容`} onChange={(e) => editMon(m.id, { req: e.target.value })} />
          <button type="button" className="icon danger"
            aria-label={`要望${i + 1} を削除`}
            onClick={() => update((d) => { d.monitors = d.monitors.filter((x) => x.id !== m.id); })}>×</button>
        </div>
      ))}
      <div className="add-bar">
        <button type="button" onClick={() => update((d) => {
          d.monitors.push({ id: newId(), memberId: null, wedgePartId: null, req: "" });
        })}>＋ 要望</button>
      </div>
    </div>
  );
}
