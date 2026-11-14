import { doorList, memberName, reservationTotals } from "../model/derive";
import type { Show } from "../model/show";
import { Sheet, SheetHeader } from "./common";

/** The door list handed to the venue: guests in 五十音 order, cancelled ones left out. */
export function ReservationSheet({ show }: { show: Show }) {
  const opt = show.print.reserve;
  const list = doorList(show);
  const { tickets, guests, byMember } = reservationTotals(show);

  return (
    <Sheet orientation="portrait">
      <SheetHeader show={show} doc="取り置きリスト" />
      <table className="reserve-table">
        <thead>
          <tr>
            <th className="c">No.</th>
            <th>お名前</th>
            {opt.kana && <th>よみがな</th>}
            <th className="c">枚数</th>
            {opt.member && <th>担当</th>}
            {opt.note && <th>備考</th>}
            <th className="c">受付</th>
          </tr>
        </thead>
        <tbody>
          {list.map((r, i) => (
            <tr key={r.id}>
              <td className="n">{i + 1}</td>
              <td><b>{r.name}</b></td>
              {opt.kana && <td>{r.kana}</td>}
              <td className="n">{r.count}</td>
              {opt.member && <td>{memberName(show, r.memberId)}</td>}
              {opt.note && <td>{r.note}</td>}
              <td className="c">{r.status === "来場" ? "済" : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {list.length === 0 && <p className="reserve-empty">取り置きはありません</p>}
      <div className="tot">
        合計 <b>{tickets}枚</b>（{guests}件）
        {opt.member && byMember.length > 0 && <>　{byMember.map((m) => `${m.name} ${m.tickets}枚`).join(" / ")}</>}
      </div>
    </Sheet>
  );
}
