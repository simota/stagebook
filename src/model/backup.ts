import { parseShow, type Show } from "./show";

/** The file formats 「JSON読み込み」 accepts: one show (from 「JSON書き出し」) or a backup of all shows. */
const BACKUP_FORMAT = "setlist-generator-backup";

export type Backup = { format: typeof BACKUP_FORMAT; version: 1; exportedAt: string; shows: Show[] };

export const backupOf = (shows: Show[]): Backup =>
  ({ format: BACKUP_FORMAT, version: 1, exportedAt: new Date().toISOString(), shows });

export type ImportResult =
  | { ok: true; kind: "show"; show: Show }
  | { ok: true; kind: "backup"; shows: Show[]; skipped: number }
  | { ok: false; error: string };

export function parseImport(data: unknown): ImportResult {
  if (typeof data === "object" && data !== null && "format" in data && data.format === BACKUP_FORMAT) {
    const list = "shows" in data && Array.isArray(data.shows) ? data.shows : null;
    if (!list) return { ok: false, error: "バックアップの中身が壊れています（shows がありません）" };
    const results = list.map(parseShow);
    const shows = results.flatMap((r) => (r.ok ? [r.show] : []));
    return { ok: true, kind: "backup", shows, skipped: results.length - shows.length };
  }
  const r = parseShow(data);
  return r.ok ? { ok: true, kind: "show", show: r.show } : r;
}
