import { create } from "zustand";
import { sampleShow } from "../model/sample";
import { emptyShow, newId, type Show } from "../model/show";
import { applyStageFile } from "../model/stageFile";
import * as db from "./persistence";

export type Tab = "info" | "members" | "setlist" | "stage" | "gear" | "cue" | "reserve" | "timetable" | "text";
export type SheetId = "performer" | "staff" | "stage" | "cue" | "timetable" | "reserve";
type Notice = { kind: "info" | "error"; text: string };
/** `base` is the form as text when the draft was started, to tell whether the form changed underneath it. */
type TextDraft = { text: string; base: string };

const TAB_SHEET: Record<Tab, SheetId> = {
  info: "performer", members: "stage", setlist: "performer", stage: "stage", gear: "stage", cue: "cue", timetable: "timetable", reserve: "reserve", text: "performer",
};

const HISTORY_LIMIT = 100;
/** Edits closer together than this (keystrokes, drag moves) become one undo step. */
const COALESCE_MS = 600;

type State = {
  index: db.ShowSummary[];
  show: Show;
  past: Show[];
  future: Show[];
  lastEditAt: number;
  tab: Tab;
  sheet: SheetId;
  selectedPartId: string | null;
  notice: Notice | null;
  /** Unapplied text from the テキスト tab; null while it matches the form. Kept across tabs, dropped with the show. */
  textDraft: TextDraft | null;
  update: (recipe: (draft: Show) => void) => void;
  undo: () => void;
  redo: () => void;
  openShow: (id: string) => void;
  createShow: (kind: "empty" | "sample" | "duplicate") => void;
  deleteCurrent: () => void;
  importFile: (file: File) => Promise<void>;
  /** Replaces the current show's stage setup with a file from 「ステージ設定を書き出し」; undoable. */
  importStage: (file: File) => Promise<void>;
  openShared: (show: Show) => void;
  setTab: (tab: Tab) => void;
  setSheet: (sheet: SheetId) => void;
  selectPart: (id: string | null) => void;
  setNotice: (notice: Notice | null) => void;
  setTextDraft: (draft: TextDraft | null) => void;
};

const errorNotice = (text: string | null): Notice | null => (text ? { kind: "error", text } : null);

function initial(): Pick<State, "index" | "show" | "notice"> {
  const { index, rebuilt } = db.loadIndex();
  const rebuiltNotice: Notice | null = rebuilt ? { kind: "error", text: "公演一覧のデータが壊れていたため、保存済みの公演から作り直しました" } : null;
  const id = db.lastShowId() ?? index[0]?.id;
  const loaded = id ? db.loadShow(id) : null;
  if (loaded?.ok) return { index, show: loaded.show, notice: rebuiltNotice };
  const show = sampleShow();
  const saved = db.saveShow(show, index);
  const loadError = loaded && !loaded.ok ? `前回の公演データを開けませんでした（${loaded.error}）` : null;
  return { index: saved.index, show, notice: errorNotice(saved.error ?? loadError) ?? rebuiltNotice };
}

export const useShowStore = create<State>((set, get) => {
  /** Switches to another show; history belongs to one show and is dropped. */
  const switchTo = (show: Show, notice: Notice | null = null) => {
    const saved = db.saveShow(show, get().index);
    set({ show, index: saved.index, past: [], future: [], selectedPartId: null, textDraft: null, notice: errorNotice(saved.error) ?? notice });
  };

  const persist = (show: Show) => {
    const saved = db.saveShow(show, get().index);
    set({ index: saved.index, notice: errorNotice(saved.error) ?? (get().notice?.kind === "error" ? null : get().notice) });
  };

  return {
    ...initial(),
    past: [],
    future: [],
    lastEditAt: 0,
    tab: "setlist",
    sheet: "performer",
    selectedPartId: null,
    textDraft: null,

    update: (recipe) => {
      const { show, past, lastEditAt } = get();
      const draft = structuredClone(show);
      recipe(draft);
      const now = Date.now();
      const nextPast = now - lastEditAt < COALESCE_MS && past.length ? past : [...past, show].slice(-HISTORY_LIMIT);
      set({ show: draft, past: nextPast, future: [], lastEditAt: now });
      persist(draft);
    },

    undo: () => {
      const { past, show, future } = get();
      const prev = past[past.length - 1];
      if (!prev) return;
      set({ show: prev, past: past.slice(0, -1), future: [show, ...future], lastEditAt: 0 });
      persist(prev);
    },

    redo: () => {
      const { past, show, future } = get();
      const [next, ...rest] = future;
      if (!next) return;
      set({ show: next, past: [...past, show], future: rest, lastEditAt: 0 });
      persist(next);
    },

    openShow: (id) => {
      const r = db.loadShow(id);
      if (!r.ok) return set({ notice: { kind: "error", text: r.error } });
      switchTo(r.show);
    },

    createShow: (kind) => {
      const show =
        kind === "sample" ? sampleShow()
        : kind === "empty" ? emptyShow()
        : { ...structuredClone(get().show), id: newId() };
      const label = { sample: "サンプル公演を作りました", empty: "新しい公演を作りました", duplicate: "この公演を複製しました" }[kind];
      switchTo(show, { kind: "info", text: label });
    },

    deleteCurrent: () => {
      const removed = db.deleteShow(get().show.id, get().index);
      set({ index: removed.index });
      const next = removed.index[0] && db.loadShow(removed.index[0].id);
      switchTo(next && next.ok ? next.show : emptyShow(), errorNotice(removed.error) ?? { kind: "info", text: "公演を削除しました" });
    },

    importFile: async (file) => {
      const r = await db.readImportFile(file);
      if (!r.ok) return set({ notice: { kind: "error", text: `読み込めませんでした: ${r.error}` } });
      if (r.kind === "show") {
        return switchTo({ ...r.show, id: newId() }, { kind: "info", text: `「${file.name}」を新しい公演として読み込みました` });
      }
      let index = get().index;
      let error: string | null = null;
      for (const show of r.shows) {
        const keepId = !index.some((s) => s.id === show.id);
        const saved = db.storeShow(keepId ? show : { ...show, id: newId() }, index);
        index = saved.index;
        error ??= saved.error;
      }
      const skipped = r.skipped ? `（読めなかった ${r.skipped} 件は飛ばしました）` : "";
      set({
        index,
        notice: errorNotice(error) ?? { kind: "info", text: `バックアップから ${r.shows.length} 件の公演を復元しました${skipped}。上の一覧から開けます` },
      });
    },

    importStage: async (file) => {
      let data: unknown;
      try {
        data = JSON.parse(await file.text());
      } catch (e) {
        return set({ notice: { kind: "error", text: `読み込めませんでした: JSONとして読めません: ${(e as Error).message}` } });
      }
      const r = applyStageFile(get().show, data);
      if (!r.ok) return set({ notice: { kind: "error", text: `読み込めませんでした: ${r.error}` } });
      set({ lastEditAt: 0 }); // its own undo step, never merged with an edit just before
      get().update((d) => {
        d.members = r.show.members;
        d.stageParts = r.show.stageParts;
        d.inputs = r.show.inputs;
        d.gear = r.show.gear;
        d.monitors = r.show.monitors;
      });
      const added = r.addedMembers ? `（メンバーを ${r.addedMembers} 人追加）` : "";
      set({ selectedPartId: null, lastEditAt: 0, notice: { kind: "info", text: `「${file.name}」のステージ設定に置き換えました${added}。「元に戻す」で戻せます` } });
    },

    openShared: (show) =>
      switchTo({ ...show, id: newId() }, { kind: "info", text: `共有リンクから「${show.meta.band || "無題"}」の公演を読み込みました。あなたのブラウザに新しい公演として保存されています` }),

    setTab: (tab) => set({ tab, sheet: TAB_SHEET[tab] }),
    setSheet: (sheet) => set({ sheet }),
    selectPart: (selectedPartId) => set({ selectedPartId }),
    setNotice: (notice) => set({ notice }),
    setTextDraft: (textDraft) => set({ textDraft }),
  };
});
