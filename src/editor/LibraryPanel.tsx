import { useMemo, useState } from "react";
import { mmss } from "../model/derive";
import { buildSongLibrary, itemFromLibrary, searchLibrary, songKey, type LibrarySong } from "../model/library";
import { loadAllShows } from "../store/persistence";
import { useShowStore } from "../store/showStore";

const MAX_RESULTS = 50;

export function LibraryPanel({ onClose }: { onClose: () => void }) {
  const show = useShowStore((s) => s.show);
  const index = useShowStore((s) => s.index);
  const update = useShowStore((s) => s.update);
  const [query, setQuery] = useState("");
  const [added, setAdded] = useState<string[]>([]);

  // Every edit re-saves the open show and so changes `index`; the library is rebuilt only when another show
  // changes, which `othersKey` captures.
  const others = index.filter((s) => s.id !== show.id);
  const othersKey = others.map((s) => `${s.id}@${s.updatedAt}`).join(",");
  const library = useMemo(() => buildSongLibrary(loadAllShows(others)), [othersKey]);
  const inSetlist = new Set(show.items.filter((i) => i.kind === "song").map(songKey));
  const results = searchLibrary(library, query);

  const add = (song: LibrarySong) => {
    update((d) => { d.items.push(itemFromLibrary(song)); });
    setAdded((a) => [...a, song.item.title]);
  };

  return (
    <section className="library" aria-labelledby="library-title" onKeyDown={(e) => {
      if (e.key === "Escape") onClose();
    }}>
      <div className="line">
        <h2 id="library-title">曲ライブラリ <small>ほかの公演で演奏した {library.length} 曲</small></h2>
        <span className="spacer" />
        <button type="button" onClick={onClose}>閉じる</button>
      </div>
      {library.length === 0 ? (
        <p className="hint">ほかの公演に曲がありません。公演を作って曲を入れると、ここから BPM・キー・尺・照明の指示ごと呼び出せます。</p>
      ) : (
        <>
          <input type="search" className="library-search" value={query} placeholder="曲名・原曲アーティストで探す"
            aria-label="曲ライブラリを検索" autoFocus onChange={(e) => setQuery(e.target.value)} />
          <p className="hint" role="status">
            {added.length > 0 ? `「${added[added.length - 1]}」をセットリストの最後に追加しました（計 ${added.length} 曲）` : `${results.length} 曲`}
          </p>
          <ul className="library-list">
            {results.slice(0, MAX_RESULTS).map((s) => (
              <li key={s.key}>
                <div className="library-song">
                  <b>{s.item.title}</b>
                  {s.item.artist && <span className="hint">（{s.item.artist}）</span>}
                  {inSetlist.has(s.key) && <span className="badge">セトリ内</span>}
                  <div className="hint">
                    {[s.item.bpm && `♩=${s.item.bpm}`, s.item.key, s.item.durSec != null && mmss(s.item.durSec)].filter(Boolean).join(" · ")}
                    {"　"}{s.playedCount}公演 · 最終 {s.lastPlayed.date || "日付なし"} {s.lastPlayed.venue}
                  </div>
                </div>
                <button type="button" onClick={() => add(s)} aria-label={`${s.item.title} を追加`}>＋ 追加</button>
              </li>
            ))}
          </ul>
          {results.length > MAX_RESULTS && <p className="hint">ほか {results.length - MAX_RESULTS} 曲。検索で絞り込んでください。</p>}
        </>
      )}
    </section>
  );
}
