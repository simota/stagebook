import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseImport } from "../model/backup";
import { sampleShow } from "../model/sample";

class MemoryStorage {
  map = new Map<string, string>();
  failWrites = false;
  get length() { return this.map.size; }
  key(i: number) { return [...this.map.keys()][i] ?? null; }
  getItem(k: string) { return this.map.get(k) ?? null; }
  setItem(k: string, v: string) {
    if (this.failWrites) throw new DOMException("quota", "QuotaExceededError");
    this.map.set(k, v);
  }
  removeItem(k: string) { this.map.delete(k); }
  clear() { this.map.clear(); }
}

let storage: MemoryStorage;

beforeEach(() => {
  storage = new MemoryStorage();
  vi.stubGlobal("localStorage", storage);
  vi.resetModules();
});

const importStore = async () => (await import("./showStore")).useShowStore;
const importDb = () => import("./persistence");

describe("persistence", () => {
  it("rebuilds a corrupted index from the stored shows", async () => {
    const show = sampleShow();
    storage.setItem(`setlist:show:${show.id}`, JSON.stringify(show));
    storage.setItem("setlist:index", "{broken");
    const db = await importDb();
    const r = db.loadIndex();
    expect(r.rebuilt).toBe(true);
    expect(r.index.map((s) => s.id)).toEqual([show.id]);
    expect(JSON.parse(storage.getItem("setlist:index")!)).toHaveLength(1);
  });

  it("rejects an index with the wrong shape", async () => {
    storage.setItem("setlist:index", JSON.stringify([{ id: 1 }]));
    expect((await importDb()).loadIndex()).toEqual({ index: [], rebuilt: true });
  });

  it("reports a failed write instead of throwing and keeps the old index", async () => {
    const db = await importDb();
    storage.failWrites = true;
    const r = db.saveShow(sampleShow(), []);
    expect(r.error).toContain("QuotaExceededError");
    expect(r.index).toEqual([]);
  });
});

describe("store", () => {
  it("starts with the sample when storage is empty and saves it", async () => {
    const store = await importStore();
    expect(store.getState().show.meta.band).toBe("SAMPLE BAND");
    expect(store.getState().index).toHaveLength(1);
    expect(store.getState().notice).toBeNull();
  });

  it("starts and tells the user when the index is corrupted", async () => {
    storage.setItem("setlist:index", "{broken");
    const store = await importStore();
    expect(store.getState().show.meta.band).toBe("SAMPLE BAND");
    expect(store.getState().notice?.kind).toBe("error");
  });

  it("starts in memory with an error when the browser blocks storage", async () => {
    vi.stubGlobal("localStorage", new Proxy({}, { get() { throw new DOMException("blocked", "SecurityError"); } }));
    const store = await importStore();
    expect(store.getState().show.meta.band).toBe("SAMPLE BAND");
    expect(store.getState().notice).toMatchObject({ kind: "error" });
    store.getState().update((d) => { d.meta.band = "X"; });
    store.getState().deleteCurrent();
    expect(store.getState().notice).toMatchObject({ kind: "error" });
  });

  it("keeps editing in memory and shows an error when saving fails", async () => {
    const store = await importStore();
    storage.failWrites = true;
    store.getState().update((d) => { d.meta.band = "X"; });
    expect(store.getState().show.meta.band).toBe("X");
    expect(store.getState().notice).toMatchObject({ kind: "error" });
    storage.failWrites = false;
    vi.setSystemTime(Date.now() + 1000);
    store.getState().update((d) => { d.meta.band = "Y"; });
    expect(store.getState().notice).toBeNull();
    vi.useRealTimers();
  });

  it("undoes and redoes, coalescing rapid edits into one step", async () => {
    vi.useFakeTimers();
    const store = await importStore();
    const s = () => store.getState();
    s().update((d) => { d.meta.band = "A"; });
    vi.advanceTimersByTime(100);
    s().update((d) => { d.meta.band = "AB"; });
    vi.advanceTimersByTime(1000);
    s().update((d) => { d.meta.band = "ABC"; });
    expect(s().past).toHaveLength(2);

    s().undo();
    expect(s().show.meta.band).toBe("AB");
    s().undo();
    expect(s().show.meta.band).toBe("SAMPLE BAND");
    s().undo();
    expect(s().show.meta.band).toBe("SAMPLE BAND");
    s().redo();
    s().redo();
    expect(s().show.meta.band).toBe("ABC");
    expect(JSON.parse(storage.getItem(`setlist:show:${s().show.id}`)!).meta.band).toBe("ABC");

    s().undo();
    s().update((d) => { d.meta.venue = "V"; });
    expect(s().future).toHaveLength(0);
    vi.useRealTimers();
  });

  it("replaces the stage setup from a stage file as one undo step, and leaves the show alone on a bad file", async () => {
    const store = await importStore();
    const s = () => store.getState();
    const { stageFileOf } = await import("../model/stageFile");
    const file = stageFileOf(s().show);
    s().update((d) => { d.stageParts = []; d.inputs = []; d.meta.band = "edited"; });
    await s().importStage(new File([JSON.stringify(file)], "stage.json"));
    expect(s().show.stageParts).toEqual(file.stageParts);
    expect(s().show.meta.band).toBe("edited");
    expect(s().notice?.kind).toBe("info");
    expect(JSON.parse(storage.getItem(`setlist:show:${s().show.id}`)!).stageParts).toHaveLength(file.stageParts.length);
    s().undo();
    expect(s().show.stageParts).toEqual([]);
    expect(s().show.meta.band).toBe("edited");

    const before = s().show;
    await s().importStage(new File(["{not json"], "bad.json"));
    expect(s().notice?.kind).toBe("error");
    await s().importStage(new File([JSON.stringify(before)], "show.json"));
    expect(s().notice?.text).toContain("ステージ設定ではありません");
    expect(s().show).toBe(before);
  });

  it("drops history when switching shows", async () => {
    const store = await importStore();
    store.getState().update((d) => { d.meta.band = "A"; });
    store.getState().createShow("empty");
    expect(store.getState().past).toHaveLength(0);
    expect(store.getState().notice).toMatchObject({ kind: "info" });
  });
});

describe("backup and share", () => {
  it("restores every show from a backup, renaming ids that already exist and skipping broken ones", async () => {
    const store = await importStore();
    const db = await importDb();
    const current = store.getState().show;
    const other = { ...sampleShow(), meta: { ...sampleShow().meta, band: "OTHER" } };
    const backup = { ...db.makeBackup([]), shows: [current, other, { broken: true }] };
    await store.getState().importFile(new File([JSON.stringify(backup)], "backup.json"));
    const s = store.getState();
    expect(s.index).toHaveLength(3);
    expect(new Set(s.index.map((i) => i.id)).size).toBe(3);
    expect(s.index.some((i) => i.id === other.id)).toBe(true);
    expect(s.show.id).toBe(current.id);
    expect(s.notice?.text).toContain("2 件");
    expect(s.notice?.text).toContain("1 件は飛ばしました");
  });

  it("round-trips all shows through makeBackup", async () => {
    const store = await importStore();
    store.getState().createShow("sample");
    const db = await importDb();
    const backup = db.makeBackup(store.getState().index);
    expect(backup.shows).toHaveLength(2);
    expect(parseImport(JSON.parse(JSON.stringify(backup)))).toMatchObject({ ok: true, kind: "backup", skipped: 0 });
  });

  it("rejects a backup without shows", () => {
    expect(parseImport({ format: "setlist-generator-backup" })).toMatchObject({ ok: false });
  });

  it("opens a shared show as a new show", async () => {
    const store = await importStore();
    const shared = { ...sampleShow(), meta: { ...sampleShow().meta, band: "SHARED" } };
    store.getState().openShared(shared);
    expect(store.getState().show.meta.band).toBe("SHARED");
    expect(store.getState().show.id).not.toBe(shared.id);
    expect(store.getState().index).toHaveLength(2);
  });
});
