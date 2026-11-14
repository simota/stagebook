import type { Show } from "../model/show";
import { useShowStore } from "../store/showStore";

type MetaKey = keyof Omit<Show["meta"], "slotSec" | "startTime">;

const FIELDS: { key: MetaKey; label: string; type?: string; placeholder?: string }[] = [
  { key: "band", label: "バンド名" },
  { key: "event", label: "公演名" },
  { key: "venue", label: "会場" },
  { key: "date", label: "日付", type: "date" },
  { key: "slot", label: "出番", placeholder: "3組目 / 19:30〜" },
  { key: "contact", label: "連絡先", placeholder: "担当 名前 / 電話番号" },
];

export function ShowInfoForm() {
  const show = useShowStore((s) => s.show);
  const update = useShowStore((s) => s.update);
  return (
    <div className="panel form">
      {FIELDS.map((f) => (
        <label key={f.key}>
          <span>{f.label}</span>
          <input type={f.type ?? "text"} value={show.meta[f.key]} placeholder={f.placeholder}
            onChange={(e) => update((d) => { d.meta[f.key] = e.target.value; })} />
        </label>
      ))}
      <label>
        <span>持ち時間（分）</span>
        <input type="number" min={0} className="num" value={show.meta.slotSec / 60}
          onChange={(e) => update((d) => { d.meta.slotSec = Math.max(0, Math.round(Number(e.target.value) * 60)); })} />
      </label>
      <label>
        <span>開始時刻</span>
        <input type="time" className="time" value={show.meta.startTime}
          onChange={(e) => update((d) => { d.meta.startTime = e.target.value; })} />
      </label>
      <p className="hint">開始時刻を入れると、スタッフ用セットリストと音響照明シートに各曲の開始時刻が載ります。</p>
      <p className="hint">各シートに載せる項目（BPM・注釈・列・連絡先など）は、右のプレビューの「表示する項目」で切り替えられます。</p>
    </div>
  );
}
