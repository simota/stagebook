import { rowTimes } from "../model/derive";
import type { Show } from "../model/show";
import { Sheet, SheetHeader } from "./common";

/** The whole day at the venue, with the band's own set picked out. */
export function TimetableSheet({ show }: { show: Show }) {
  const opt = show.print.timetable;
  return (
    <Sheet orientation="portrait">
      <SheetHeader show={show} doc="TIMETABLE（当日の流れ）" />
      <table className="timetable-table">
        <thead>
          <tr>
            <th className="c">時刻</th>
            <th>内容</th>
            {opt.note && <th>備考</th>}
          </tr>
        </thead>
        <tbody>
          {show.timetable.map((row) => {
            const { start, end } = rowTimes(show, row);
            const ours = row.kind === "ours";
            return (
              <tr key={row.id} className={ours ? "ours" : undefined}>
                <td className="n">{start}{end && `〜${end}`}</td>
                <td>{ours ? <b>{show.meta.band || "自分たち"}（出番）</b> : row.title}</td>
                {opt.note && <td>{row.note}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
      {show.timetable.length === 0 && <p className="reserve-empty">タイムテーブルはまだありません</p>}
    </Sheet>
  );
}
