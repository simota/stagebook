import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { downloadStageFile } from "./download";
import { CueEditor } from "./editor/CueEditor";
import { GearEditor } from "./editor/GearEditor";
import { MembersEditor } from "./editor/MembersEditor";
import { SetlistEditor } from "./editor/SetlistEditor";
import { ShowInfoForm } from "./editor/ShowInfoForm";
import { StageEditor } from "./editor/StageEditor";
import { PrintOptionsPanel } from "./editor/PrintOptionsPanel";
import { ReservationEditor } from "./editor/ReservationEditor";
import { TimetableEditor } from "./editor/TimetableEditor";
import { TextEditor } from "./editor/TextEditor";
import { SHEET_FONT_IDS, SHEET_FONTS, type SheetFont } from "./model/fonts";
import type { Show } from "./model/show";
import { CueSheet } from "./sheets/CueSheet";
import { PerformerSetlist } from "./sheets/PerformerSetlist";
import { ReservationSheet } from "./sheets/ReservationSheet";
import { TimetableSheet } from "./sheets/TimetableSheet";
import { StaffSetlist } from "./sheets/StaffSetlist";
import { StagePlotSheet } from "./sheets/StagePlotSheet";
import { bumpFontVersion, loadSheetFont, sheetFontReady, sheetFontStyle } from "./sheets/sheetFont";
import { Topbar } from "./Topbar";
import { useShowStore, type SheetId, type Tab } from "./store/showStore";

const TABS: { id: Tab; label: string; render: () => ReactNode }[] = [
  { id: "info", label: "基本情報", render: () => <ShowInfoForm /> },
  { id: "members", label: "メンバー", render: () => <MembersEditor /> },
  { id: "setlist", label: "セットリスト", render: () => <SetlistEditor /> },
  { id: "stage", label: "ステージ", render: () => <StageEditor exportStage={() => downloadStageFile(useShowStore.getState().show)} /> },
  { id: "gear", label: "機材・返し", render: () => <GearEditor /> },
  { id: "cue", label: "音響照明", render: () => <CueEditor /> },
  { id: "reserve", label: "取り置き", render: () => <ReservationEditor /> },
  { id: "timetable", label: "タイムテーブル", render: () => <TimetableEditor /> },
  { id: "text", label: "テキスト", render: () => <TextEditor /> },
];

const SHEETS: { id: SheetId; label: string; widthMm: number; heightMm: number; render: (s: Show) => ReactNode }[] = [
  { id: "performer", label: "A-1 演者用", widthMm: 210, heightMm: 297, render: (s) => <PerformerSetlist show={s} /> },
  { id: "staff", label: "A-2 スタッフ用", widthMm: 210, heightMm: 297, render: (s) => <StaffSetlist show={s} /> },
  { id: "stage", label: "B ステージ図", widthMm: 297, heightMm: 210, render: (s) => <StagePlotSheet show={s} /> },
  { id: "cue", label: "C 音響照明", widthMm: 297, heightMm: 210, render: (s) => <CueSheet show={s} /> },
  { id: "reserve", label: "D 取り置き", widthMm: 210, heightMm: 297, render: (s) => <ReservationSheet show={s} /> },
  { id: "timetable", label: "E タイムテーブル", widthMm: 210, heightMm: 297, render: (s) => <TimetableSheet show={s} /> },
];

const MM_TO_PX = 96 / 25.4;

/** Mixed-orientation printing in one job is verified on Chromium only (docs/plans/architecture.md). */
const CAN_PRINT_ALL = /Chrome\//.test(navigator.userAgent);

const isTextField = (el: EventTarget | null) => el instanceof HTMLElement && !!el.closest("input, textarea, select, [contenteditable]");

export function App() {
  const show = useShowStore((s) => s.show);
  const tab = useShowStore((s) => s.tab);
  const sheet = useShowStore((s) => s.sheet);
  const notice = useShowStore((s) => s.notice);
  const { setTab, setSheet, setNotice, undo, redo, update } = useShowStore.getState();
  const [printTarget, setPrintTarget] = useState<SheetId | "all">("all");
  const [preparingPrint, setPreparingPrint] = useState(false);
  const tabRefs = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({});
  const printRootRef = useRef<HTMLDivElement>(null);
  const fontStyle = sheetFontStyle(show.font);
  /** 「全シート印刷」 leaves out the optional sheets a show has nothing for, instead of printing them blank. */
  const inPrintAll = (id: SheetId) =>
    id === "reserve" ? show.reservationBlankRows > 0 || show.reservations.some((r) => r.status !== "キャンセル")
    : id === "timetable" ? show.timetable.length > 0
    : true;

  useEffect(() => {
    loadSheetFont(show.font).catch(() => setNotice({
      kind: "error",
      text: `フォント「${SHEET_FONTS[show.font].label}」を読み込めませんでした。オフラインの可能性があります。端末のフォントで表示しています`,
    }));
  }, [show.font, setNotice]);

  useEffect(() => {
    const reset = () => setPrintTarget("all");
    window.addEventListener("afterprint", reset);
    return () => window.removeEventListener("afterprint", reset);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "z" || isTextField(e.target)) return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  const print = async (target: SheetId | "all") => {
    if (show.font !== "system") {
      setPreparingPrint(true);
      try {
        await sheetFontReady(show.font, printRootRef.current!.textContent ?? "");
      } catch {
        setNotice({ kind: "error", text: `フォント「${SHEET_FONTS[show.font].label}」の一部を読み込めなかったため、その文字は端末のフォントで印刷されます` });
      } finally {
        setPreparingPrint(false);
      }
    }
    // The bump refits the performer sheet in this same synchronous render, with every glyph now loaded.
    flushSync(() => {
      bumpFontVersion();
      setPrintTarget(target);
    });
    window.print();
  };

  const onTabKey = (e: ReactKeyboardEvent, i: number) => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    const to = e.key === "Home" ? 0 : e.key === "End" ? TABS.length - 1 : step !== undefined ? (i + step + TABS.length) % TABS.length : null;
    if (to === null) return;
    e.preventDefault();
    setTab(TABS[to].id);
    tabRefs.current[TABS[to].id]?.focus();
  };

  const current = SHEETS.find((s) => s.id === sheet)!;

  return (
    <>
      <div className="app">
        <Topbar />
        {notice && (
          <div className={`notice ${notice.kind}`} role={notice.kind === "error" ? "alert" : "status"}>
            <span>{notice.text}</span>
            <button type="button" className="icon" onClick={() => setNotice(null)} aria-label="お知らせを閉じる">×</button>
          </div>
        )}
        <div className="workspace">
          <section className="editor" aria-label="編集">
            <div className="tabs" role="tablist" aria-label="編集する内容">
              {TABS.map((t, i) => (
                <button type="button" role="tab" key={t.id} id={`tab-${t.id}`} aria-controls="editor-panel"
                  aria-selected={tab === t.id} tabIndex={tab === t.id ? 0 : -1}
                  ref={(el) => { tabRefs.current[t.id] = el; }}
                  className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)} onKeyDown={(e) => onTabKey(e, i)}>
                  {t.label}
                </button>
              ))}
            </div>
            <div role="tabpanel" id="editor-panel" aria-labelledby={`tab-${tab}`}>
              {TABS.find((t) => t.id === tab)!.render()}
            </div>
          </section>
          <section className="preview" aria-label="印刷プレビュー" style={fontStyle}>
            <div className="preview-bar">
              <div className="group" role="group" aria-label="プレビューするシート">
                {SHEETS.map((s) => (
                  <button type="button" key={s.id} aria-pressed={sheet === s.id} className={sheet === s.id ? "on" : ""}
                    onClick={() => setSheet(s.id)}>{s.label}</button>
                ))}
              </div>
              <span className="spacer" />
              <button type="button" className="primary" disabled={preparingPrint} onClick={() => void print(sheet)}>
                {preparingPrint ? "フォントを準備中…" : "このシートを印刷"}
              </button>
              {CAN_PRINT_ALL && <button type="button" disabled={preparingPrint} onClick={() => void print("all")}>全シート印刷</button>}
              <label className="font-picker">
                フォント
                <select value={show.font} onChange={(e) => update((d) => { d.font = e.target.value as SheetFont; })}>
                  {SHEET_FONT_IDS.map((id) => <option key={id} value={id}>{SHEET_FONTS[id].label}</option>)}
                </select>
              </label>
            </div>
            <PrintOptionsPanel key={sheet} sheet={sheet} />
            <ScaledSheet widthMm={current.widthMm} heightMm={current.heightMm}>{current.render(show)}</ScaledSheet>
          </section>
        </div>
      </div>
      <div className="print-root" aria-hidden ref={printRootRef} style={fontStyle}>
        {SHEETS.map((s) => (
          <div key={s.id} className={`print-page${printTarget === s.id || (printTarget === "all" && inPrintAll(s.id)) ? " print-on" : ""}`}>
            {s.render(show)}
          </div>
        ))}
      </div>
      <Datalists />
    </>
  );
}

function ScaledSheet({ widthMm, heightMm, children }: { widthMm: number; heightMm: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  useLayoutEffect(() => {
    const el = ref.current!;
    const ro = new ResizeObserver(() => setScale(Math.min(1, el.clientWidth / (widthMm * MM_TO_PX))));
    ro.observe(el);
    return () => ro.disconnect();
  }, [widthMm]);
  return (
    <div className="scaled" ref={ref} style={{ height: heightMm * MM_TO_PX * scale }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: `${widthMm}mm` }}>{children}</div>
    </div>
  );
}

function Datalists() {
  const lists: Record<string, string[]> = {
    "link-options": ["曲間なし", "F.O.で次へ", "カウントで次へ", "SEから入る", "MCを挟む"],
    "mic-options": ["SM58（会場）", "SM57（会場）", "Beta58A（持込）", "Beta91A（会場）", "コンデンサー（会場）", "DI（会場）", "DI（持込）", "会場"],
    "mood-options": ["激しく", "明るく", "しっとり", "爽やか", "温かく", "盛大に", "静かに", "地明かり", "お任せ"],
    "cue-options": ["暗転スタート", "頭のキメで全灯", "サビで明るく", "ソロでスポット", "エンディングで暗転", "ストロボNG"],
  };
  return (
    <>
      {Object.entries(lists).map(([id, opts]) => (
        <datalist id={id} key={id}>{opts.map((o) => <option key={o} value={o} />)}</datalist>
      ))}
    </>
  );
}
