import { newId, type SetItem, type Show } from "./show";

export type LibrarySong = {
  key: string;
  item: SetItem;
  playedCount: number;
  lastPlayed: { date: string; venue: string };
};

const normalize = (s: string) => s.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");

/** Same title and original artist = same song, regardless of width or case. */
export const songKey = (it: Pick<SetItem, "title" | "artist">) => `${normalize(it.title)}|${normalize(it.artist)}`;

/**
 * Every song played in the given shows, once each. The copy kept is the one from the most recent show
 * (by date, then by order given), because BPM, cues and arrangement notes drift over time.
 */
export function buildSongLibrary(shows: Show[]): LibrarySong[] {
  const byKey = new Map<string, LibrarySong & { showIds: Set<string> }>();
  for (const show of shows) {
    for (const it of show.items) {
      if (it.kind !== "song" || !it.title.trim()) continue;
      const key = songKey(it);
      const entry = byKey.get(key);
      const played = { date: show.meta.date, venue: show.meta.venue };
      if (!entry) {
        byKey.set(key, { key, item: it, playedCount: 1, lastPlayed: played, showIds: new Set([show.id]) });
        continue;
      }
      if (!entry.showIds.has(show.id)) {
        entry.showIds.add(show.id);
        entry.playedCount++;
      }
      if (show.meta.date >= entry.lastPlayed.date) Object.assign(entry, { item: it, lastPlayed: played });
    }
  }
  return [...byKey.values()]
    .map(({ showIds: _ids, ...song }) => song)
    .sort((a, b) => b.lastPlayed.date.localeCompare(a.lastPlayed.date) || a.item.title.localeCompare(b.item.title, "ja"));
}

export function searchLibrary(songs: LibrarySong[], query: string): LibrarySong[] {
  const q = normalize(query);
  if (!q) return songs;
  return songs.filter((s) => normalize(s.item.title).includes(q) || normalize(s.item.artist).includes(q));
}

export const itemFromLibrary = (song: LibrarySong): SetItem => ({ ...structuredClone(song.item), id: newId() });
