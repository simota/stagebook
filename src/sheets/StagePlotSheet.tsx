import { memberName, powerTotal } from "../model/derive";
import type { Show } from "../model/show";
import { Sheet, SheetHeader } from "./common";
import { StageSvg } from "./stage/StageSvg";

export function StagePlotSheet({ show }: { show: Show }) {
  const wedgeLabel = (id: string | null) => show.stageParts.find((p) => p.id === id)?.label;
  const opt = show.print.stage;
  const right = opt.gear || opt.monitors;
  return (
    <Sheet orientation="landscape">
      <SheetHeader show={show} doc="STAGE PLOT / INPUT LIST / BACKLINE" />
      {opt.plot && <div className={`stage${opt.channels || right ? "" : " stage-only"}`}><StageSvg show={show} /></div>}
      <div className="b-bottom" style={{ gridTemplateColumns: opt.channels && right ? undefined : "1fr" }}>
        {opt.channels && <div>
          <div className="sec-title">チャンネル表 <small>黒丸の番号 = ステージ図の番号</small></div>
          <table>
            <thead>
              <tr><th>CH</th><th>楽器</th><th>マイク / DI</th><th>スタンド</th><th className="c">48V</th><th className="c">持込</th><th>備考</th></tr>
            </thead>
            <tbody>
              {show.inputs.map((c, i) => (
                <tr key={c.id}>
                  <td className="n">{i + 1}</td><td><b>{c.name}</b></td><td>{c.mic}</td><td>{c.stand || "—"}</td>
                  <td className="c">{c.phantom ? "○" : ""}</td><td className="c">{c.own ? "○" : ""}</td><td>{c.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>}
        {right && <div className="b-right">
          {opt.gear && <div>
            <div className="sec-title">機材表 <small>電源が必要な機材 合計 {powerTotal(show)}口</small></div>
            <table>
              <thead>
                <tr><th>パート</th><th>担当</th><th>機材</th><th className="c">持込/借用</th><th className="c">電源</th><th>備考</th></tr>
              </thead>
              <tbody>
                {show.gear.map((g) => (
                  <tr key={g.id}>
                    <td>{show.members.find((m) => m.id === g.memberId)?.part ?? "共通"}</td>
                    <td>{memberName(show, g.memberId)}</td>
                    <td>{g.item}</td>
                    <td className="c">{g.own === "持込" ? <b>持込</b> : "借用"}</td>
                    <td className="c">{g.power || ""}</td>
                    <td>{g.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>}
          {opt.monitors && <div>
            <div className="sec-title">返し（モニター）の要望</div>
            <table>
              <tbody>
                {show.monitors.map((m) => {
                  const wedge = wedgeLabel(m.wedgePartId);
                  return (
                    <tr key={m.id}>
                      <td className="nowrap">{memberName(show, m.memberId)}{wedge && `（${wedge}）`}</td>
                      <td>{m.req}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>}
        </div>}
      </div>
    </Sheet>
  );
}
