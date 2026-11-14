import { songNumbers } from "../model/derive";
import { LIGHT_COLORS, LIGHT_LEVELS, LIGHT_MOTIONS, type Light, type SetItem } from "../model/show";
import { COLOR_INFO, KIND_LABEL } from "../model/labels";
import { useShowStore } from "../store/showStore";

const MAX_COLORS = 3;

export function CueEditor() {
  const show = useShowStore((s) => s.show);
  const update = useShowStore((s) => s.update);
  const nos = songNumbers(show);
  const edit = (id: string, recipe: (it: SetItem) => void) => update((d) => { recipe(d.items.find((i) => i.id === id)!); });
  const setLight = (id: string, p: Partial<Light>) => edit(id, (it) => { Object.assign(it.light, p); });

  return (
    <div className="panel">
      <div className="general-edit">
        {([["light", "照明 全般", "全体的に暗め / ストロボNG など"], ["sound", "音響 全般", "外音・返しの方針"], ["sync", "SE・同期・クリック", "再生機器と出力方法"]] as const).map(([k, label, ph]) => (
          <label key={k}>
            <span>{label}</span>
            <textarea rows={2} value={show.general[k]} placeholder={ph}
              onChange={(e) => update((d) => { d.general[k] = e.target.value; })} />
          </label>
        ))}
      </div>
      {show.items.filter((it) => it.kind !== "encore").map((it) => (
        <div className={`cue-row k-${it.kind}`} key={it.id}>
          <div className="cue-title">
            <span className="no">{nos.get(it.id) ?? KIND_LABEL[it.kind]}</span> {it.title || "（無題）"}
          </div>
          <div className="line">
            <div className="colors" role="group" aria-label="照明の色">
              {LIGHT_COLORS.map((c) => {
                const on = it.light.colors.includes(c);
                const full = !on && it.light.colors.length >= MAX_COLORS;
                return (
                  <button type="button" key={c} className={`chip${on ? " on" : ""}`} disabled={full} aria-pressed={on}
                    onClick={() => setLight(it.id, { colors: on ? it.light.colors.filter((x) => x !== c) : [...it.light.colors, c] })}>
                    <i style={{ background: COLOR_INFO[c].fill }} />{COLOR_INFO[c].name}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="line">
            <input value={it.light.mood} placeholder="雰囲気" aria-label="雰囲気" list="mood-options" onChange={(e) => setLight(it.id, { mood: e.target.value })} />
            <select value={it.light.level} aria-label="明るさ" onChange={(e) => setLight(it.id, { level: e.target.value as Light["level"] })}>
              {LIGHT_LEVELS.map((v) => <option key={v} value={v}>{v || "明るさ"}</option>)}
            </select>
            <select value={it.light.motion} aria-label="動き" onChange={(e) => setLight(it.id, { motion: e.target.value as Light["motion"] })}>
              {LIGHT_MOTIONS.map((v) => <option key={v} value={v}>{v || "動き"}</option>)}
            </select>
            <input className="grow" value={it.light.cue} placeholder="きっかけ・特記（照明）" aria-label="きっかけ・特記（照明）" list="cue-options"
              onChange={(e) => setLight(it.id, { cue: e.target.value })} />
          </div>
          <div className="line">
            <input className="grow" value={it.sound} placeholder="音響（コーラス / ソロ担当 / 効果）" aria-label="音響"
              onChange={(e) => edit(it.id, (x) => { x.sound = e.target.value; })} />
          </div>
        </div>
      ))}
    </div>
  );
}
