import { newId } from "../model/show";
import { useShowStore } from "../store/showStore";

export function MembersEditor() {
  const show = useShowStore((s) => s.show);
  const update = useShowStore((s) => s.update);
  const remove = (id: string) => update((d) => {
    d.members = d.members.filter((m) => m.id !== id);
    for (const p of d.stageParts) if (p.memberId === id) p.memberId = null;
    for (const g of d.gear) if (g.memberId === id) g.memberId = null;
    d.monitors = d.monitors.filter((m) => m.memberId !== id);
    for (const r of d.reservations) if (r.memberId === id) r.memberId = null;
  });
  return (
    <div className="panel">
      <p className="hint">名前を変えると、ステージ図・機材表・返しの要望の表記もまとめて変わります。</p>
      {show.members.map((m, i) => (
        <div className="line" key={m.id}>
          <input className="grow" value={m.name} placeholder="名前" aria-label={`メンバー${i + 1} 名前`}
            onChange={(e) => update((d) => { d.members.find((x) => x.id === m.id)!.name = e.target.value; })} />
          <input value={m.part} placeholder="パート（Gt.Vo など）" aria-label={`メンバー${i + 1} パート`}
            onChange={(e) => update((d) => { d.members.find((x) => x.id === m.id)!.part = e.target.value; })} />
          <button type="button" className="icon danger" aria-label={`${m.name || `メンバー${i + 1}`} を削除`} onClick={() => remove(m.id)}>×</button>
        </div>
      ))}
      <div className="add-bar">
        <button type="button" onClick={() => update((d) => { d.members.push({ id: newId(), name: "", part: "" }); })}>＋ メンバー</button>
      </div>
    </div>
  );
}
