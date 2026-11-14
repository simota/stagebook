import { z } from "zod";
import { backupOf, parseImport, type Backup, type ImportResult } from "../model/backup";
import { showTitle } from "../model/derive";
import { parseShow, type Show } from "../model/show";

const INDEX_KEY = "setlist:index";
const LAST_KEY = "setlist:last";
const SHOW_PREFIX = "setlist:show:";
const showKey = (id: string) => `${SHOW_PREFIX}${id}`;

const summarySchema = z.object({ id: z.string(), title: z.string(), updatedAt: z.number() });
export type ShowSummary = z.infer<typeof summarySchema>;

type LoadResult = { ok: true; show: Show } | { ok: false; error: string };
type IndexResult = { index: ShowSummary[]; rebuilt: boolean };
type WriteResult = { index: ShowSummary[]; error: string | null };

/** Stored data may come from an older build or be hand-edited, so it is validated like an import. */
export function loadShow(id: string): LoadResult {
  const raw = read(showKey(id));
  if (!raw) return { ok: false, error: "保存データが見つかりません" };
  try {
    return parseShow(JSON.parse(raw));
  } catch (e) {
    return { ok: false, error: `保存データを読めません: ${(e as Error).message}` };
  }
}

/** The index only lists what is stored under `setlist:show:*`, so a damaged index is rebuilt from those keys. */
export function loadIndex(): IndexResult {
  const raw = read(INDEX_KEY);
  if (raw === null) return { index: [], rebuilt: false };
  const r = z.array(summarySchema).safeParse(parseJsonOrUndefined(raw));
  return r.success ? { index: r.data, rebuilt: false } : { index: rebuildIndex(), rebuilt: true };
}

/** Unreadable JSON is reported to the caller as `undefined`, which the schema then rejects. */
function parseJsonOrUndefined(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function rebuildIndex(): ShowSummary[] {
  const index: ShowSummary[] = [];
  for (const key of storedKeys()) {
    if (!key.startsWith(SHOW_PREFIX)) continue;
    const r = loadShow(key.slice(SHOW_PREFIX.length));
    if (r.ok) index.push({ id: r.show.id, title: showTitle(r.show), updatedAt: 0 });
  }
  write(INDEX_KEY, JSON.stringify(index));
  return index;
}

/**
 * Every access goes through these helpers: reading `localStorage` throws when the browser blocks site data,
 * and writing throws when the quota is exceeded. A blocked read behaves like an empty store; a failed write
 * is returned as a message so the app keeps working in memory and tells the user.
 */
function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storedKeys(): string[] {
  try {
    return Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)).filter((k): k is string => k !== null);
  } catch {
    return [];
  }
}

function write(key: string, value: string): string | null {
  try {
    localStorage.setItem(key, value);
    return null;
  } catch (e) {
    return `ブラウザに保存できませんでした（${(e as Error).name}）。容量不足か、ブラウザの設定でサイトデータの保存が止められている可能性があります。編集内容は「JSON書き出し」で退避してください`;
  }
}

/** Stores a show and lists it, without making it the one reopened on next start. */
export function storeShow(show: Show, index: ShowSummary[]): WriteResult {
  const entry = { id: show.id, title: showTitle(show), updatedAt: Date.now() };
  const next = [entry, ...index.filter((s) => s.id !== show.id)];
  const error = write(showKey(show.id), JSON.stringify(show)) ?? write(INDEX_KEY, JSON.stringify(next));
  return { index: error ? index : next, error };
}

export function saveShow(show: Show, index: ShowSummary[]): WriteResult {
  const r = storeShow(show, index);
  return r.error ? r : { ...r, error: write(LAST_KEY, show.id) };
}

export function deleteShow(id: string, index: ShowSummary[]): WriteResult {
  const next = index.filter((s) => s.id !== id);
  const error = write(INDEX_KEY, JSON.stringify(next));
  if (error) return { index, error };
  try {
    localStorage.removeItem(showKey(id));
  } catch (e) {
    return { index: next, error: `公演データを消せませんでした（${(e as Error).name}）` };
  }
  return { index: next, error: null };
}

export const lastShowId = () => read(LAST_KEY);

/** Every readable saved show; unreadable ones are skipped (they are reported when opened). */
export function loadAllShows(index: ShowSummary[]): Show[] {
  return index.flatMap((s) => {
    const r = loadShow(s.id);
    return r.ok ? [r.show] : [];
  });
}

export const makeBackup = (index: ShowSummary[]): Backup => backupOf(loadAllShows(index));

export async function readImportFile(file: File): Promise<ImportResult> {
  try {
    return parseImport(JSON.parse(await file.text()));
  } catch (e) {
    return { ok: false, error: `JSONとして読めません: ${(e as Error).message}` };
  }
}
