import type { Input, PartType } from "./show";

type InputTemplate = Omit<Input, "id" | "partId">;

export type PartTemplate = {
  key: string;
  name: string;
  type: PartType;
  label: string;
  sub?: string;
  w: number;
  h: number;
  inputs: InputTemplate[];
};

const inp = (name: string, mic: string, stand = "", phantom = false): InputTemplate => ({
  name, mic, stand, phantom, own: false, note: "",
});

export const DRUM_STANDARD: InputTemplate[] = [
  inp("Kick", "会場", "ショート"),
  inp("Snare", "会場", "ショート"),
  inp("Hi-Hat", "会場", "ショート", true),
  inp("Tom 1", "会場", "クリップ"),
  inp("Tom 2", "会場", "クリップ"),
  inp("Floor Tom", "会場", "クリップ"),
  inp("OH L", "会場", "ブーム", true),
  inp("OH R", "会場", "ブーム", true),
];

const DRUM_MINIMAL: InputTemplate[] = [
  inp("Kick", "会場", "ショート"),
  inp("Snare", "会場", "ショート"),
  inp("OH", "会場", "ブーム", true),
];

/**
 * Parts the stage plot offers. Placing one also adds its inputs to the channel list, so a common rig (a drum kit,
 * a miked bass with a DI, an acoustic guitar) arrives with its channels instead of being typed line by line.
 */
export const PART_TEMPLATES: PartTemplate[] = [
  { key: "person", name: "メンバー", type: "person", label: "名前", sub: "", w: 8.4, h: 8.4, inputs: [] },
  { key: "vocal-mic", name: "ボーカルマイク", type: "mic", label: "", w: 3, h: 3, inputs: [inp("Vo", "SM58（会場）", "ブーム")] },
  { key: "cho-mic", name: "コーラスマイク", type: "mic", label: "", w: 3, h: 3, inputs: [inp("Cho", "SM58（会場）", "ブーム")] },
  { key: "gt-amp", name: "ギターアンプ（コンボ）", type: "amp", label: "Gt Amp", sub: "JC-120（会場）", w: 20, h: 7, inputs: [inp("Gt", "SM57（会場）", "ショート")] },
  // A stack is one part: seen from above, the head sits on the cabinet, so the footprint is the cabinet's.
  {
    key: "gt-stack", name: "ギターアンプ（ヘッド＋キャビ）", type: "amp", label: "Gt Amp", sub: "ヘッド＋キャビ（会場）", w: 20, h: 9,
    inputs: [inp("Gt", "SM57（会場）", "ショート")],
  },
  {
    key: "gt-amp-stereo", name: "ギターアンプ（ステレオ 2ch）", type: "amp", label: "Gt Amp", sub: "ステレオ", w: 30, h: 7,
    inputs: [inp("Gt L", "SM57（会場）", "ショート"), inp("Gt R", "SM57（会場）", "ショート")],
  },
  { key: "ba-amp", name: "ベースアンプ（ヘッド＋キャビ）", type: "amp", label: "Ba Amp", sub: "ヘッド＋キャビ（会場）", w: 20, h: 9, inputs: [inp("Ba", "DI（会場）")] },
  {
    key: "ba-amp-di-mic", name: "ベースアンプ（ヘッド＋キャビ、DI＋マイク 2ch）", type: "amp", label: "Ba Amp", sub: "ヘッド＋キャビ（会場）", w: 20, h: 9,
    inputs: [inp("Ba DI", "DI（会場）"), inp("Ba Mic", "SM57（会場）", "ショート")],
  },
  { key: "ac-gt", name: "アコギ（DI）", type: "box", label: "A.Gt", w: 6, h: 3, inputs: [inp("A.Gt", "DI（会場）")] },
  {
    key: "ac-gt-mic", name: "アコギ（DI＋マイク 2ch）", type: "box", label: "A.Gt", w: 6, h: 3,
    inputs: [inp("A.Gt DI", "DI（会場）"), inp("A.Gt Mic", "コンデンサー（会場）", "ブーム", true)],
  },
  { key: "drums", name: "ドラム（8ch）", type: "drums", label: "Dr", w: 26, h: 20, inputs: DRUM_STANDARD },
  { key: "drums-min", name: "ドラム（3ch）", type: "drums", label: "Dr", w: 26, h: 20, inputs: DRUM_MINIMAL },
  { key: "riser", name: "ドラム台", type: "riser", label: "ドラム台", w: 44, h: 19, inputs: [] },
  { key: "keys", name: "キーボード", type: "box", label: "Key", w: 16, h: 4, inputs: [inp("Key L", "DI（会場）"), inp("Key R", "DI（会場）")] },
  { key: "keys-mono", name: "キーボード（モノ 1ch）", type: "box", label: "Key", w: 16, h: 4, inputs: [inp("Key", "DI（会場）")] },
  { key: "cajon", name: "カホン", type: "box", label: "Cajon", w: 5, h: 5, inputs: [inp("Cajon", "Beta91A（会場）")] },
  { key: "horn", name: "管楽器マイク", type: "mic", label: "", w: 3, h: 3, inputs: [inp("Sax", "SM57（会場）", "ブーム")] },
  { key: "board", name: "エフェクターボード", type: "box", label: "Board", w: 9, h: 3.4, inputs: [] },
  { key: "pc", name: "PC / 同期", type: "box", label: "PC (SE)", w: 13, h: 5, inputs: [inp("SE L", "DI（会場）"), inp("SE R", "DI（会場）")] },
  { key: "di", name: "DI", type: "box", label: "DI", w: 5, h: 3, inputs: [inp("Line", "DI（会場）")] },
  { key: "wedge", name: "モニター", type: "wedge", label: "Mon", w: 10, h: 3.2, inputs: [] },
  { key: "power", name: "電源", type: "power", label: "電源1口", w: 3.2, h: 4.6, inputs: [] },
  { key: "text", name: "テキスト", type: "text", label: "メモ", w: 12, h: 3, inputs: [] },
];
