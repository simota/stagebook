import { useLayoutEffect, useRef } from "react";
import { songNumbers } from "../model/derive";
import type { Show } from "../model/show";
import { Sheet, SheetHeader } from "./common";
import { useFontVersion } from "./sheetFont";

const MAX_PT = 46;
const MIN_PT = 10;

/**
 * The last fitted size. The preview and the print copy are the same sheet at the same size, so the second one to
 * render reuses the first one's result instead of measuring again. One entry: only the current show is drawn.
 */
let lastFit: { key: string; pt: number } | null = null;

/**
 * Picks the largest whole-pt size at which every title fits on one line and the list fits the page (MIN_PT if
 * none does). Overflow only grows with the size, so a search that measures a few sizes finds the same size as
 * stepping down 1pt at a time (up to 36 layouts) — this runs on every keystroke in the setlist.
 * `drawn` must change whenever anything drawn on the sheet changes.
 */
function useFitText(drawn: string) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const list = ref.current!;
    if (lastFit?.key === drawn) {
      list.style.fontSize = `${lastFit.pt}pt`;
      return;
    }
    const fits = (pt: number) => {
      list.style.fontSize = `${pt}pt`;
      return list.scrollHeight <= list.clientHeight + 1 && list.scrollWidth <= list.clientWidth + 1;
    };
    // Search between `lo` (fits, or is the floor) and `hi` (overflows; MAX_PT + 1 means "not known to").
    // Start from the last size: one edit rarely changes it, so two measurements usually settle it.
    let lo = MIN_PT;
    let hi = MAX_PT + 1;
    const guess = lastFit?.pt;
    if (guess === undefined) {
      if (fits(MAX_PT)) lo = MAX_PT; // first fit on this page: plain binary search below the largest size
      else hi = MAX_PT;
    } else if (fits(guess)) {
      if (guess === MAX_PT) lo = MAX_PT;
      else if (fits(guess + 1)) lo = guess + 1;
      else [lo, hi] = [guess, guess + 1];
    } else if (guess <= MIN_PT + 1) hi = guess; // MIN_PT is the floor either way
    else if (fits(guess - 1)) [lo, hi] = [guess - 1, guess];
    else hi = guess - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (fits(mid)) lo = mid;
      else hi = mid;
    }
    list.style.fontSize = `${lo}pt`;
    lastFit = { key: drawn, pt: lo };
  }, [drawn]);
  return ref;
}

export function PerformerSetlist({ show }: { show: Show }) {
  const nos = songNumbers(show);
  const { inverse, showBpm, showNote, showNumbers, showLink, showSe, showMc } = show.performer;
  const items = show.items.filter((it) => (it.kind === "se" ? showSe : ["mc", "change", "memo"].includes(it.kind) ? showMc : true));
  // Refit only when something drawn on this sheet changes, including the typeface and font files finishing loading.
  // Every edit clones the whole show, so object identity would refit (≈7 forced layouts per sheet) on stage,
  // channel and cue edits that this sheet does not show.
  const fontVersion = useFontVersion();
  const drawn = JSON.stringify([
    items.map((it) => [it.kind, it.title, it.link, it.bpm, it.note]), show.performer, show.print.header, show.meta, show.font, fontVersion,
  ]);
  const listRef = useFitText(drawn);

  return (
    <Sheet orientation="portrait">
      <div className={`perf${inverse ? " inverse" : ""}${showNumbers ? "" : " no-numbers"}`}>
        <SheetHeader show={show} doc="SETLIST" />
        <div className="perf-list" ref={listRef}>
          {items.length === 0 && <div className="perf-empty">セットリストに曲を追加してください</div>}
          {items.map((it) => {
            switch (it.kind) {
              case "song":
                return (
                  <div className="p-row" key={it.id}>
                    <span className="p-no">{nos.get(it.id)}</span>
                    <span className="p-title">
                      {it.title}
                      {showLink && it.link && <span className="p-link">→ {it.link}</span>}
                    </span>
                    <span className="p-bpm">{showBpm && it.bpm ? `♩=${it.bpm}` : ""}</span>
                    {showNote && it.note && <span className="p-note">▸ {it.note}</span>}
                  </div>
                );
              case "se":
                return (
                  <div className="p-row p-se" key={it.id}>
                    <span className="p-no">SE</span>
                    <span className="p-title">{it.title}</span>
                    <span />
                  </div>
                );
              case "encore":
                return <div className="p-div" key={it.id}>{it.title}</div>;
              default:
                return (
                  <div className="p-mc" key={it.id}>
                    ── {it.title} ──{showNote && it.note && <span> {it.note}</span>}
                  </div>
                );
            }
          })}
        </div>
      </div>
    </Sheet>
  );
}
