import { DRUM_STANDARD } from "./presets";
import { defaultPrint, newId, type Input, type SetItem, type Show, type StagePart } from "./show";

const item = (p: Partial<SetItem> & Pick<SetItem, "id" | "kind" | "title">): SetItem => ({
  artist: "", bpm: null, key: "", durSec: null, link: "", note: "", sound: "",
  light: { colors: [], mood: "", level: "", motion: "", cue: "" },
  ...p,
});

const part = (p: Partial<StagePart> & Pick<StagePart, "id" | "type" | "x" | "y" | "w" | "h">): StagePart => ({
  rot: 0, label: "", sub: "", memberId: null, ...p,
});

const input = (partId: string, name: string, mic: string, extra: Partial<Input> = {}): Input => ({
  id: `in-${partId}-${name}`, partId, name, mic, stand: "", phantom: false, own: false, note: "", ...extra,
});

export function sampleShow(): Show {
  return {
    schemaVersion: 1,
    id: newId(),
    meta: {
      band: "SAMPLE BAND", event: "Autumn Night Vol.3", venue: "SAMPLE HALL", date: "2026-12-05",
      slot: "3組目", slotSec: 30 * 60, contact: "担当 山田 / 090-0000-0000", startTime: "19:30",
    },
    performer: { inverse: false, showBpm: true, showNote: true, showNumbers: true, showLink: true, showSe: true, showMc: true },
    print: defaultPrint(),
    font: "system",
    members: [
      { id: "yamada", name: "山田", part: "Gt.Vo" },
      { id: "suzuki", name: "鈴木", part: "Gt.Cho" },
      { id: "tanaka", name: "田中", part: "Ba.Cho" },
      { id: "sato", name: "佐藤", part: "Dr" },
    ],
    items: [
      item({ id: "i1", kind: "se", title: "Opening SE", durSec: 90, link: "F.O.で1曲目", note: "PCから再生（CH15-16）",
        light: { colors: ["blue"], mood: "静かに", level: "暗", motion: "なし", cue: "暗転の中でSE開始 / メンバー入場" }, sound: "SEはPCから出力" }),
      item({ id: "i2", kind: "song", title: "夜明けのスロープ", bpm: 168, key: "E", durSec: 250, note: "カウント4つで入る",
        light: { colors: ["red", "white"], mood: "激しく", level: "明", motion: "速い", cue: "頭のキメで全灯" }, sound: "Cho: 鈴木 / Gtソロ: 上手（鈴木）" }),
      item({ id: "i3", kind: "song", title: "シグナル", bpm: 132, key: "A", durSec: 225, link: "曲間なし", note: "ラスサビ前にブレイク1小節",
        light: { colors: ["yellow", "orange"], mood: "明るく", level: "明", motion: "曲に合わせる", cue: "ブレイクで暗転→サビで戻す" }, sound: "Cho: 鈴木・田中" }),
      item({ id: "i4", kind: "mc", title: "MC①", durSec: 90, note: "自己紹介 / 次回告知",
        light: { colors: ["auto"], mood: "地明かり", level: "中", motion: "なし", cue: "" }, sound: "MCは山田のマイク" }),
      item({ id: "i5", kind: "song", title: "Blue Hour", bpm: 76, key: "D", durSec: 300, note: "Voのみで始まる（板付き）",
        light: { colors: ["blue", "purple"], mood: "しっとり", level: "暗", motion: "なし", cue: "Vo1人に絞って始める / 2番からバンド全体" }, sound: "Voにリバーブ深め" }),
      item({ id: "i6", kind: "song", title: "春に咲く", artist: "サンプル原曲アーティスト", bpm: 120, key: "G", durSec: 240, link: "曲間なし",
        light: { colors: ["green", "white"], mood: "爽やか", level: "中", motion: "ゆっくり", cue: "" }, sound: "Cho: 田中" }),
      item({ id: "i7", kind: "song", title: "ノイズキャンセル", bpm: 190, key: "F#m", durSec: 200, note: "ドラムから入る",
        light: { colors: ["red"], mood: "激しく", level: "明", motion: "速い", cue: "ストロボNG（全般要望参照）" }, sound: "Gtソロ: 下手（山田）" }),
      item({ id: "i8", kind: "mc", title: "MC②", durSec: 60, note: "物販案内",
        light: { colors: ["auto"], mood: "地明かり", level: "中", motion: "なし", cue: "" } }),
      item({ id: "i9", kind: "song", title: "最終列車", bpm: 144, key: "C", durSec: 270, note: "エンディングは山田の合図で",
        light: { colors: ["orange", "white"], mood: "盛大に", level: "明", motion: "曲に合わせる", cue: "最後のジャーンで暗転" } }),
      item({ id: "i10", kind: "encore", title: "ENCORE" }),
      item({ id: "i11", kind: "song", title: "またね", bpm: 100, key: "E", durSec: 210, note: "時間が押したらカット",
        light: { colors: ["white"], mood: "温かく", level: "中", motion: "ゆっくり", cue: "" }, sound: "Cho: 全員" }),
    ],
    stageParts: [
      part({ id: "riser", type: "riser", x: 80, y: 11.5, w: 44, h: 19, label: "ドラム台" }),
      part({ id: "drums", type: "drums", x: 80, y: 11, w: 26, h: 20, label: "Dr", memberId: "sato" }),
      part({ id: "ba-amp", type: "amp", x: 30, y: 6, w: 20, h: 7, label: "Ba Amp", sub: "Ampeg SVT（会場）" }),
      part({ id: "gt-amp-y", type: "amp", x: 115, y: 6, w: 20, h: 7, label: "Gt Amp 山田", sub: "JC-120（会場）" }),
      part({ id: "gt-amp-s", type: "amp", x: 140, y: 6, w: 20, h: 7, label: "Gt Amp 鈴木", sub: "JCM2000（ヘッド持込）" }),
      part({ id: "p-yamada", type: "person", x: 80, y: 30, w: 8.4, h: 8.4, memberId: "yamada" }),
      part({ id: "mic-yamada", type: "mic", x: 80, y: 37, w: 3, h: 3 }),
      part({ id: "p-suzuki", type: "person", x: 132, y: 28, w: 8.4, h: 8.4, memberId: "suzuki" }),
      part({ id: "mic-suzuki", type: "mic", x: 132, y: 35, w: 3, h: 3 }),
      part({ id: "p-tanaka", type: "person", x: 28, y: 28, w: 8.4, h: 8.4, memberId: "tanaka" }),
      part({ id: "mic-tanaka", type: "mic", x: 28, y: 35, w: 3, h: 3 }),
      part({ id: "pc", type: "box", x: 101, y: 31, w: 13, h: 5, label: "PC (SE)" }),
      part({ id: "board-y", type: "box", x: 88, y: 32, w: 9, h: 3.4, label: "Board" }),
      part({ id: "board-s", type: "box", x: 140, y: 30, w: 9, h: 3.4, label: "Board" }),
      part({ id: "pow-y", type: "power", x: 62, y: 31, w: 3.2, h: 4.6, label: "電源2口" }),
      part({ id: "pow-s", type: "power", x: 146, y: 25, w: 3.2, h: 4.6, label: "電源1口" }),
      part({ id: "mon1", type: "wedge", x: 28, y: 42, w: 10, h: 3.2, label: "Mon 1" }),
      part({ id: "mon2", type: "wedge", x: 80, y: 42, w: 10, h: 3.2, label: "Mon 2" }),
      part({ id: "mon3", type: "wedge", x: 132, y: 42, w: 10, h: 3.2, label: "Mon 3" }),
      part({ id: "mon4", type: "wedge", x: 52, y: 13, w: 10, h: 3.2, label: "Mon 4", rot: 90 }),
    ],
    inputs: [
      ...DRUM_STANDARD.map((t) => ({ ...t, id: `in-drums-${t.name}`, partId: "drums" })),
      input("ba-amp", "Ba 田中", "DI（会場）", { note: "ラインのみ" }),
      input("gt-amp-y", "Gt 山田", "SM57（会場）", { stand: "ショート" }),
      input("gt-amp-s", "Gt 鈴木", "SM57（会場）", { stand: "ショート" }),
      input("mic-yamada", "Vo 山田", "Beta58A（持込）", { stand: "ブーム", own: true }),
      input("mic-suzuki", "Cho 鈴木", "SM58（会場）", { stand: "ブーム" }),
      input("mic-tanaka", "Cho 田中", "SM58（会場）", { stand: "ブーム" }),
      input("pc", "SE L", "DI（会場）", { note: "PC→IF持込" }),
      input("pc", "SE R", "DI（会場）", { note: "PC→IF持込" }),
    ],
    gear: [
      { id: "g1", memberId: "yamada", item: "ギター / エフェクターボード", own: "持込", power: 1, note: "" },
      { id: "g2", memberId: "yamada", item: "ギターアンプ Roland JC-120", own: "借用", power: 0, note: "" },
      { id: "g3", memberId: "yamada", item: "ボーカルマイク Shure Beta58A", own: "持込", power: 0, note: "" },
      { id: "g4", memberId: "suzuki", item: "ギター / エフェクターボード", own: "持込", power: 1, note: "" },
      { id: "g5", memberId: "suzuki", item: "Marshall JCM2000 ヘッド", own: "持込", power: 1, note: "キャビは会場のもの" },
      { id: "g6", memberId: "tanaka", item: "ベース", own: "持込", power: 0, note: "" },
      { id: "g7", memberId: "tanaka", item: "ベースアンプ Ampeg SVT", own: "借用", power: 0, note: "" },
      { id: "g8", memberId: "sato", item: "スネア / ペダル / シンバル", own: "持込", power: 0, note: "キットは会場のもの" },
      { id: "g9", memberId: null, item: "PC + オーディオIF（SE用）", own: "持込", power: 1, note: "" },
    ],
    monitors: [
      { id: "mo1", memberId: "yamada", wedgePartId: "mon2", req: "Vo多め / Gt鈴木少し / Kick" },
      { id: "mo2", memberId: "suzuki", wedgePartId: "mon3", req: "Vo / 自分のCho / Gt山田少し" },
      { id: "mo3", memberId: "tanaka", wedgePartId: "mon1", req: "Vo / Kick / Snare" },
      { id: "mo4", memberId: "sato", wedgePartId: "mon4", req: "Ba多め / Vo / SEのクリックは不要" },
    ],
    timetable: [
      { id: "t1", kind: "event", start: "16:00", end: "", title: "入り", note: "機材は裏口から" },
      { id: "t2", kind: "event", start: "16:30", end: "18:00", title: "リハーサル（逆リハ）", note: "3組目は 17:10〜17:30" },
      { id: "t3", kind: "event", start: "18:00", end: "", title: "開場", note: "" },
      { id: "t4", kind: "event", start: "18:30", end: "18:55", title: "1組目", note: "" },
      { id: "t5", kind: "event", start: "19:00", end: "19:25", title: "2組目", note: "転換 5分" },
      { id: "t6", kind: "ours", start: "", end: "", title: "", note: "" },
      { id: "t7", kind: "event", start: "20:10", end: "20:40", title: "4組目", note: "" },
      { id: "t8", kind: "event", start: "21:00", end: "", title: "撤収・精算", note: "" },
    ],
    reservations: [
      { id: "r1", name: "高橋 一郎", kana: "たかはし いちろう", count: 2, memberId: "yamada", status: "予約", note: "" },
      { id: "r2", name: "伊藤 花子", kana: "いとう はなこ", count: 1, memberId: "suzuki", status: "予約", note: "物販も見たい" },
      { id: "r3", name: "渡辺 健", kana: "わたなべ けん", count: 3, memberId: "sato", status: "予約", note: "" },
    ],
    general: {
      light: "全体的に暗めが好み。ストロボは使わないでください。",
      sound: "外音はVoを聴かせる方向で。返しは各自の要望を参照。",
      sync: "SEのみPCで再生（同期・クリックは使いません）。PC→IF→DI×2、CH15-16。",
    },
  };
}
