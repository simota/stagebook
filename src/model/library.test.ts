import { describe, expect, it } from "vitest";
import { buildSongLibrary, itemFromLibrary, searchLibrary, songKey } from "./library";
import { sampleShow } from "./sample";
import type { Show } from "./show";

function show(date: string, venue: string, songs: { title: string; bpm?: number; artist?: string }[]): Show {
  const base = sampleShow();
  const tpl = base.items.find((i) => i.kind === "song")!;
  return {
    ...base,
    meta: { ...base.meta, date, venue },
    items: songs.map((s, i) => ({ ...tpl, id: `${date}-${i}`, title: s.title, bpm: s.bpm ?? null, artist: s.artist ?? "" })),
  };
}

describe("song library", () => {
  const older = show("2026-10-01", "A", [{ title: "シグナル", bpm: 128 }, { title: "Blue Hour" }]);
  const newer = show("2026-12-05", "B", [{ title: "ｼｸﾞﾅﾙ", bpm: 132 }, { title: "春に咲く", artist: "Someone" }]);

  it("merges the same song across shows and keeps the latest version", () => {
    const lib = buildSongLibrary([older, newer]);
    expect(lib).toHaveLength(3);
    const signal = lib.find((s) => s.key === songKey({ title: "シグナル", artist: "" }))!;
    expect(signal.playedCount).toBe(2);
    expect(signal.item.bpm).toBe(132);
    expect(signal.lastPlayed).toEqual({ date: "2026-12-05", venue: "B" });
  });

  it("does not depend on the order the shows are given in", () => {
    expect(buildSongLibrary([newer, older])).toEqual(buildSongLibrary([older, newer]));
  });

  it("lists recent songs first and skips untitled songs and non-songs", () => {
    const withExtras = show("2026-11-01", "C", [{ title: "" }, { title: "MCっぽい" }]);
    withExtras.items[1].kind = "mc";
    const lib = buildSongLibrary([older, newer, withExtras]);
    expect(lib.map((s) => s.item.title)).toEqual(["ｼｸﾞﾅﾙ", "春に咲く", "Blue Hour"]);
  });

  it("counts a song once per show even if it is played twice", () => {
    const twice = show("2026-12-24", "D", [{ title: "Blue Hour" }, { title: "Blue Hour" }]);
    expect(buildSongLibrary([twice])[0].playedCount).toBe(1);
  });

  it("searches title and artist ignoring width and case", () => {
    const lib = buildSongLibrary([older, newer]);
    expect(searchLibrary(lib, "しぐ").length).toBe(0);
    expect(searchLibrary(lib, "シグ").map((s) => s.item.bpm)).toEqual([132]);
    expect(searchLibrary(lib, "someone").map((s) => s.item.title)).toEqual(["春に咲く"]);
    expect(searchLibrary(lib, "  ")).toHaveLength(3);
  });

  it("copies a song with a new id so the source show is untouched", () => {
    const [song] = buildSongLibrary([newer]);
    const copy = itemFromLibrary(song);
    expect(copy.id).not.toBe(song.item.id);
    copy.light.colors.push("purple");
    expect(song.item.light.colors).not.toContain("purple");
  });
});
