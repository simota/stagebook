import { reservationText, reservationTotals } from "../model/derive";
import { newId, RESERVATION_STATUS, type Reservation } from "../model/show";
import { useShowStore } from "../store/showStore";

export function ReservationEditor() {
  const show = useShowStore((s) => s.show);
  const update = useShowStore((s) => s.update);
  const setNotice = useShowStore((s) => s.setNotice);
  const edit = (id: string, p: Partial<Reservation>) => update((d) => { Object.assign(d.reservations.find((r) => r.id === id)!, p); });
  const { tickets, guests, byMember } = reservationTotals(show);

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(reservationText(show));
      setNotice({ kind: "info", text: `取り置きリスト（${guests}件・${tickets}枚）をテキストでコピーしました` });
    } catch {
      setNotice({ kind: "error", text: "クリップボードにコピーできませんでした。ブラウザがクリップボードへのアクセスを許可しているか確認してください" });
    }
  };

  return (
    <div className="panel">
      <p className="hint">
        受付に渡す取り置きリストです。キャンセルにした予約は、リストと合計から外れます。予約者の名前を守るため、共有リンクには含まれません（JSON 書き出しとバックアップには含まれます）。
      </p>
      <div className="time-bar">
        合計 {tickets}枚（{guests}件）
        {byMember.length > 0 && <span className="hint">　{byMember.map((m) => `${m.name} ${m.tickets}枚`).join(" / ")}</span>}
      </div>
      {show.reservations.map((r, i) => (
        <div className={`line reserve-row${r.status === "キャンセル" ? " cancelled" : ""}`} key={r.id}>
          <input className="grow" value={r.name} placeholder="お名前" aria-label={`予約${i + 1} お名前`}
            onChange={(e) => edit(r.id, { name: e.target.value })} />
          <input value={r.kana} placeholder="よみがな（並べ替え用）" aria-label={`予約${i + 1} よみがな`}
            onChange={(e) => edit(r.id, { kana: e.target.value })} />
          <label className="inline">
            <input className="num" type="number" min={1} value={r.count} aria-label={`予約${i + 1} 枚数`}
              onChange={(e) => edit(r.id, { count: Math.max(1, Math.round(Number(e.target.value)) || 1) })} />枚
          </label>
          <select value={r.memberId ?? ""} aria-label={`予約${i + 1} 担当メンバー`}
            onChange={(e) => edit(r.id, { memberId: e.target.value || null })}>
            <option value="">担当なし</option>
            {show.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <select value={r.status} aria-label={`予約${i + 1} 状態`}
            onChange={(e) => edit(r.id, { status: e.target.value as Reservation["status"] })}>
            {RESERVATION_STATUS.map((s) => <option key={s}>{s}</option>)}
          </select>
          <input className="grow" value={r.note} placeholder="備考" aria-label={`予約${i + 1} 備考`}
            onChange={(e) => edit(r.id, { note: e.target.value })} />
          <button type="button" className="icon danger" aria-label={`${r.name || `予約${i + 1}`} を削除`}
            onClick={() => update((d) => { d.reservations = d.reservations.filter((x) => x.id !== r.id); })}>×</button>
        </div>
      ))}
      <div className="add-bar">
        <button type="button" onClick={() => update((d) => {
          d.reservations.push({ id: newId(), name: "", kana: "", count: 1, memberId: null, status: "予約", note: "" });
        })}>＋ 予約</button>
        <button type="button" onClick={() => void copyText()} disabled={guests === 0}>テキストでコピー</button>
      </div>
    </div>
  );
}
