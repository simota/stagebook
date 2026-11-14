import type { ReactNode } from "react";
import type { Show } from "../model/show";

export function SheetHeader({ show, doc }: { show: Show; doc: string }) {
  const { meta } = show;
  const opt = show.print.header;
  return (
    <div className="hd">
      <div>
        <div className="band">{meta.band}</div>
        <div className="doc">{doc}</div>
      </div>
      <div className="meta">
        <div><b>{meta.date}</b>　{meta.venue}</div>
        <div>
          {opt.event && meta.event}
          {meta.slot && <>　出番 <b>{meta.slot}</b></>}
          {meta.startTime && <>　開始 <b>{meta.startTime}</b></>}
          {meta.slotSec > 0 && <>　持ち時間 <b>{meta.slotSec / 60}分</b></>}
        </div>
        {opt.contact && <div>{meta.contact}</div>}
      </div>
    </div>
  );
}

export function Sheet({ orientation, className, children }: { orientation: "portrait" | "landscape"; className?: string; children: ReactNode }) {
  return <section className={`sheet ${orientation} ${className ?? ""}`}>{children}</section>;
}
