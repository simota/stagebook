import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { partDisplayName } from "../model/derive";
import { PART_TEMPLATES, type PartTemplate } from "../model/presets";
import { newId, STAGE_D, STAGE_W, type Show, type StagePart } from "../model/show";
import { StageSvg } from "../sheets/stage/StageSvg";
import { useShowStore } from "../store/showStore";
import { ChannelTable } from "./ChannelTable";

const clamp = (v: number, max: number) => Math.min(max, Math.max(0, Math.round(v)));
const RESIZABLE = new Set<StagePart["type"]>(["riser", "box", "text", "amp"]);
const MEMBER_LINKABLE = new Set<StagePart["type"]>(["person", "drums", "amp"]);

function removePart(d: Show, id: string) {
  d.stageParts = d.stageParts.filter((p) => p.id !== id);
  d.inputs = d.inputs.filter((i) => i.partId !== id);
  for (const m of d.monitors) if (m.wedgePartId === id) m.wedgePartId = null;
}

export function StageEditor() {
  const show = useShowStore((s) => s.show);
  const update = useShowStore((s) => s.update);
  const selectedId = useShowStore((s) => s.selectedPartId);
  const select = useShowStore((s) => s.selectPart);
  const svgRef = useRef<SVGSVGElement>(null);
  const selected = show.stageParts.find((p) => p.id === selectedId) ?? null;

  const toSvg = (e: { clientX: number; clientY: number }) =>
    new DOMPoint(e.clientX, e.clientY).matrixTransform(svgRef.current!.getScreenCTM()!.inverse());

  const editPart = (id: string, patch: Partial<StagePart>) =>
    update((d) => { Object.assign(d.stageParts.find((p) => p.id === id)!, patch); });

  const onPartPointerDown = (e: ReactPointerEvent, part: StagePart) => {
    e.stopPropagation();
    select(part.id);
    const start = toSvg(e);
    const move = (ev: PointerEvent) => {
      const p = toSvg(ev);
      editPart(part.id, { x: clamp(part.x + p.x - start.x, STAGE_W), y: clamp(part.y + p.y - start.y, STAGE_D) });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const addPart = (t: PartTemplate) => {
    const id = newId();
    update((d) => {
      d.stageParts.push({
        id, type: t.type, x: STAGE_W / 2, y: STAGE_D / 2, w: t.w, h: t.h, rot: 0,
        label: t.label, sub: t.sub ?? "", memberId: null,
      });
      d.inputs.push(...t.inputs.map((i) => ({ ...i, id: newId(), partId: id })));
    });
    select(id);
  };

  useEffect(() => {
    if (!selectedId) return;
    /** Only while focus is on the canvas (or nowhere): elsewhere, arrows and Backspace belong to the focused control. */
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as Node;
      if (target !== document.body && !svgRef.current?.contains(target)) return;
      const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
      if (d) {
        e.preventDefault();
        update((s) => {
          const p = s.stageParts.find((pp) => pp.id === selectedId)!;
          p.x = clamp(p.x + d[0], STAGE_W);
          p.y = clamp(p.y + d[1], STAGE_D);
        });
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        update((s) => removePart(s, selectedId));
        select(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, update, select]);

  return (
    <div className="panel">
      <div className="palette">
        {PART_TEMPLATES.map((t) => (
          <button type="button" key={t.key} onClick={() => addPart(t)}>＋ {t.name}</button>
        ))}
      </div>
      <div className="stage-canvas">
        <StageSvg show={show} interactive={{ selectedId, svgRef, onPartPointerDown, onPartFocus: (p) => select(p.id), onBackgroundPointerDown: () => select(null) }} />
      </div>
      <p className="hint">ドラッグで移動。Tab キーでパーツを選び、矢印キーで動かし、Delete で削除できます（⌘/Ctrl+Z で元に戻せます）。手前（下）が客席側です。</p>
      {selected ? <PartPanel show={show} part={selected} editPart={editPart} /> : <p className="hint">パーツを選ぶと詳細を編集できます。</p>}
      <ChannelTable />
    </div>
  );
}

function PartPanel({ show, part, editPart }: { show: Show; part: StagePart; editPart: (id: string, p: Partial<StagePart>) => void }) {
  const update = useShowStore((s) => s.update);
  const select = useShowStore((s) => s.selectPart);
  const set = (p: Partial<StagePart>) => editPart(part.id, p);
  const reorder = (toFront: boolean) => update((d) => {
    const rest = d.stageParts.filter((p) => p.id !== part.id);
    const me = d.stageParts.find((p) => p.id === part.id)!;
    d.stageParts = toFront ? [...rest, me] : [me, ...rest];
  });
  const linked = part.type === "person" && part.memberId;
  return (
    <fieldset className="part-panel">
      <legend>選択中: {partDisplayName(show, part)}</legend>
      <div className="line">
        {MEMBER_LINKABLE.has(part.type) && (
          <label>メンバー
            <select value={part.memberId ?? ""} onChange={(e) => set({ memberId: e.target.value || null })}>
              <option value="">（なし）</option>
              {show.members.map((m) => <option key={m.id} value={m.id}>{m.name}（{m.part}）</option>)}
            </select>
          </label>
        )}
        {!linked && (
          <label>ラベル<input value={part.label} onChange={(e) => set({ label: e.target.value })} /></label>
        )}
        {part.type === "amp" && (
          <label>機種<input value={part.sub} onChange={(e) => set({ sub: e.target.value })} /></label>
        )}
      </div>
      <div className="line">
        {RESIZABLE.has(part.type) && (
          <>
            <label>幅<input className="num" type="number" min={2} max={STAGE_W} value={part.w}
              onChange={(e) => set({ w: Math.max(2, Number(e.target.value)) })} /></label>
            <label>奥行<input className="num" type="number" min={2} max={STAGE_D} value={part.h}
              onChange={(e) => set({ h: Math.max(2, Number(e.target.value)) })} /></label>
          </>
        )}
        <button type="button" onClick={() => set({ rot: ((part.rot + 90) % 360) as StagePart["rot"] })}>⟳ 90°</button>
        <button type="button" onClick={() => reorder(true)}>最前面へ</button>
        <button type="button" onClick={() => reorder(false)}>最背面へ</button>
        <button type="button" className="danger" onClick={() => { update((d) => removePart(d, part.id)); select(null); }}>削除</button>
      </div>
    </fieldset>
  );
}
