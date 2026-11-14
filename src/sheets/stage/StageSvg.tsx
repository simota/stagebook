import type { PointerEvent as ReactPointerEvent, Ref } from "react";
import { channelLabel, channelsByPart, partDisplayName, partLabel } from "../../model/derive";
import { STAGE_D, STAGE_W, type Show, type StagePart } from "../../model/show";

const VIEWBOX = { x: -16, y: -4, w: 192, h: 60 };

type Interactive = {
  selectedId: string | null;
  svgRef: Ref<SVGSVGElement>;
  onPartPointerDown: (e: ReactPointerEvent, part: StagePart) => void;
  onPartFocus: (part: StagePart) => void;
  onBackgroundPointerDown: () => void;
};

type TextProps = { x: number; y: number; size: number; anchor?: "start" | "middle"; weight?: number; fill?: string; vertical?: boolean; children: string };

/** The trailing space is not rendered (SVG strips it) but keeps adjacent labels as separate words for assistive tech. */
function T({ x, y, size, anchor = "middle", weight, fill, vertical, children }: TextProps) {
  return (
    <text x={x} y={y} fontSize={size} textAnchor={anchor} fontWeight={weight} fill={fill} writingMode={vertical ? "vertical-rl" : undefined}>
      {children}{" "}
    </text>
  );
}

function badgeAt(p: StagePart): [number, number] {
  switch (p.type) {
    case "drums": return [p.x + 16, p.y + 6.5];
    case "amp": return [p.x + p.w / 2 + 1, p.y - p.h / 2 - 1];
    case "mic": return [p.x - 6, p.y];
    case "box": return [p.x, p.y - p.h / 2 - 2.6];
    default: return [p.x + p.w / 2 + 3, p.y];
  }
}

function PartShape({ p, label, sub }: { p: StagePart; label: string; sub: string }) {
  const { x, y, w, h } = p;
  switch (p.type) {
    case "riser":
      return (
        <>
          <rect x={x - w / 2} y={y - h / 2} width={w} height={h} fill="#f2f2f2" stroke="#000" strokeWidth={0.3} strokeDasharray="1.2 .8" />
          <T x={x - w / 2 + 1.2} y={y - h / 2 + 2.6} size={1.9} anchor="start" fill="#555">{label}</T>
        </>
      );
    case "drums": {
      const cym = (cx: number, cy: number) => <circle cx={cx} cy={cy} r={2.8} fill="none" stroke="#000" strokeWidth={0.25} strokeDasharray=".6 .4" />;
      const drum = (cx: number, cy: number, r: number) => <circle cx={cx} cy={cy} r={r} fill="#fff" stroke="#000" strokeWidth={0.35} />;
      return (
        <>
          {cym(x - 9, y - 4)}{cym(x + 9, y - 4)}{cym(x - 11, y + 2)}
          {drum(x, y - 1, 3.6)}{drum(x - 3.2, y - 5, 1.8)}{drum(x + 3.2, y - 5, 1.8)}{drum(x + 7, y + 2.5, 2.4)}{drum(x - 6, y + 2.5, 1.9)}
          <circle cx={x} cy={y + 5.8} r={1.6} fill="#000" />
          <T x={x} y={y + 9.8} size={2.4} weight={700}>{label}</T>
        </>
      );
    }
    case "amp":
      return (
        <>
          <rect x={x - w / 2} y={y - h / 2} width={w} height={h} fill="#fff" stroke="#000" strokeWidth={0.4} />
          <T x={x} y={y - 0.2} size={2.2} weight={700}>{label}</T>
          <T x={x} y={y + 2.4} size={1.5}>{sub}</T>
        </>
      );
    case "person":
      return (
        <>
          <circle cx={x} cy={y} r={w / 2} fill="#fff" stroke="#000" strokeWidth={0.5} />
          <T x={x} y={y + 0.2} size={2.4} weight={800}>{label}</T>
          <T x={x} y={y + 2.5} size={1.6}>{sub}</T>
        </>
      );
    case "mic":
      return (
        <>
          <circle cx={x} cy={y} r={1.1} fill="#000" />
          <line x1={x} y1={y} x2={x + 2.6} y2={y + 2.2} stroke="#000" strokeWidth={0.35} />
        </>
      );
    case "box":
      return (
        <>
          <rect x={x - w / 2} y={y - h / 2} width={w} height={h} fill="#fff" stroke="#000" strokeWidth={0.3} />
          <T x={x} y={y + 0.7} size={1.8}>{label}</T>
        </>
      );
    case "power":
      return (
        <>
          <path d={`M${x - 0.4} ${y - 2.2} L${x - 1.6} ${y + 0.3} L${x - 0.1} ${y + 0.3} L${x - 0.9} ${y + 2.4} L${x + 1.6} ${y - 0.6} L${x + 0.1} ${y - 0.6} L${x + 0.9} ${y - 2.2} Z`} fill="#000" />
          <T x={x + 2.2} y={y + 0.7} size={1.8} anchor="start">{label}</T>
        </>
      );
    case "wedge":
      return (
        <>
          <path d={`M${x - 5} ${y + 1.6} L${x + 5} ${y + 1.6} L${x + 3.6} ${y - 1.6} L${x - 3.6} ${y - 1.6} Z`} fill="#ddd" stroke="#000" strokeWidth={0.3} />
          <T x={x} y={y + 0.7} size={1.7}>{label}</T>
        </>
      );
    case "text":
      return <T x={x} y={y + 0.7} size={2}>{label}</T>;
  }
}

/** Selection and hit area: the part's bounding box, which `drums` extends downward for its label. */
function hitBox(p: StagePart) {
  const extra = p.type === "drums" ? 1.5 : 0;
  const w = Math.max(p.w, 4);
  const h = Math.max(p.h, 4);
  return { x: p.x - w / 2, y: p.y - h / 2 + extra, w, h };
}

export function StageSvg({ show, interactive }: { show: Show; interactive?: Interactive }) {
  const chs = channelsByPart(show);
  const vb = VIEWBOX;
  return (
    <svg
      ref={interactive?.svgRef}
      viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
      fontFamily="Hiragino Sans, Noto Sans JP, sans-serif"
      xmlns="http://www.w3.org/2000/svg"
      style={interactive ? { touchAction: "none", userSelect: "none" } : undefined}
    >
      <rect x={0} y={0} width={STAGE_W} height={STAGE_D} fill="#fff" stroke="#000" strokeWidth={0.6}
        onPointerDown={interactive?.onBackgroundPointerDown} />
      {interactive && <StageGrid />}
      <T x={-8} y={STAGE_D / 2} size={3.2} weight={800} vertical>下手</T>
      <T x={STAGE_W + 8} y={STAGE_D / 2} size={3.2} weight={800} vertical>上手</T>
      <T x={-8} y={STAGE_D / 2 + 9} size={1.5} fill="#555" vertical>（客席から見て左）</T>
      <T x={STAGE_W + 8} y={STAGE_D / 2 + 9} size={1.5} fill="#555" vertical>（客席から見て右）</T>
      <rect x={0} y={STAGE_D + 3} width={STAGE_W} height={6} fill="#eee" />
      <T x={STAGE_W / 2} y={STAGE_D + 7.2} size={3} weight={800}>客　席</T>
      {show.stageParts.map((p) => {
        const { label, sub } = partLabel(show, p);
        const nums = chs.get(p.id);
        const [bx, by] = badgeAt(p);
        const badge = nums && channelLabel(nums);
        const bw = badge ? Math.max(5, badge.length * 1.9 + 2.4) : 0;
        const box = hitBox(p);
        return (
          <g key={p.id}
            {...(interactive && {
              tabIndex: 0,
              role: "button",
              "aria-label": [label || partDisplayName(show, p), sub, badge].filter(Boolean).join(" "),
              "aria-description": badge ? `チャンネル ${badge}` : undefined,
              "aria-pressed": interactive.selectedId === p.id,
              onPointerDown: (e: ReactPointerEvent) => interactive.onPartPointerDown(e, p),
              onFocus: () => interactive.onPartFocus(p),
              style: { cursor: "move" },
            })}>
            <g transform={p.rot ? `rotate(${p.rot} ${p.x} ${p.y})` : undefined}>
              {interactive && <rect x={box.x} y={box.y} width={box.w} height={box.h} fill="transparent" />}
              <PartShape p={p} label={label} sub={sub} />
              {interactive?.selectedId === p.id && (
                <rect x={box.x - 0.8} y={box.y - 0.8} width={box.w + 1.6} height={box.h + 1.6} fill="none" stroke="#2563eb" strokeWidth={0.5} strokeDasharray="1 .6" />
              )}
            </g>
            {badge && (
              <>
                <rect x={bx - bw / 2} y={by - 2.3} width={bw} height={4.6} rx={2.3} fill="#000" />
                <T x={bx} y={by + 1.05} size={3} weight={700} fill="#fff">{badge}</T>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function StageGrid() {
  const lines = [];
  for (let x = 10; x < STAGE_W; x += 10) lines.push(<line key={`x${x}`} x1={x} y1={0} x2={x} y2={STAGE_D} />);
  for (let y = 10; y < STAGE_D; y += 10) lines.push(<line key={`y${y}`} x1={0} y1={y} x2={STAGE_W} y2={y} />);
  return <g stroke="#dbe4f0" strokeWidth={0.2} pointerEvents="none">{lines}</g>;
}
