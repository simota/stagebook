import { describe, expect, it } from "vitest";
import { sampleShow } from "./sample";
import { emptyShow } from "./show";
import { applyStageFile, stageFileOf } from "./stageFile";

/** What a file looks like after the round trip through disk. */
const asFile = (data: unknown) => JSON.parse(JSON.stringify(data)) as unknown;

describe("stage file", () => {
  it("carries the stage setup into another show and leaves the rest of it alone", () => {
    const from = sampleShow();
    const to = emptyShow();
    to.meta.band = "別のバンド";
    const r = applyStageFile(to, asFile(stageFileOf(from)));
    if (!r.ok) throw new Error(r.error);
    expect(r.show.meta.band).toBe("別のバンド");
    expect(r.show.items).toEqual([]);
    expect(r.show.stageParts.map((p) => p.id)).toEqual(from.stageParts.map((p) => p.id));
    expect(r.show.inputs).toEqual(from.inputs);
    expect(r.show.members.map((m) => m.name)).toEqual(from.members.map((m) => m.name));
    expect(r.addedMembers).toBe(from.members.length);
  });

  it("links parts, gear and monitors to the members they belonged to", () => {
    const from = sampleShow();
    const r = applyStageFile(emptyShow(), asFile(stageFileOf(from)));
    if (!r.ok) throw new Error(r.error);
    const nameOf = (show: typeof from, id: string | null) => show.members.find((m) => m.id === id)?.name ?? null;
    expect(r.show.stageParts.map((p) => nameOf(r.show, p.memberId))).toEqual(from.stageParts.map((p) => nameOf(from, p.memberId)));
    expect(r.show.gear.map((g) => nameOf(r.show, g.memberId))).toEqual(from.gear.map((g) => nameOf(from, g.memberId)));
    expect(r.show.monitors.map((m) => nameOf(r.show, m.memberId))).toEqual(from.monitors.map((m) => nameOf(from, m.memberId)));
  });

  it("matches members by name, so the show's own links to them survive", () => {
    const show = sampleShow();
    const file = stageFileOf(sampleShow());
    const renamed = file.members.map((m) => ({ ...m, id: `other-${m.id}` }));
    const r = applyStageFile(show, asFile({ ...file, members: renamed, stageParts: file.stageParts.map((p) => ({ ...p, memberId: p.memberId && `other-${p.memberId}` })) }));
    if (!r.ok) throw new Error(r.error);
    expect(r.addedMembers).toBe(0);
    expect(r.show.members).toEqual(show.members);
    expect(r.show.stageParts.map((p) => p.memberId)).toEqual(show.stageParts.map((p) => p.memberId));
  });

  it("rejects files that are not a stage setup, and broken ones, without touching the show", () => {
    const show = sampleShow();
    expect(applyStageFile(show, asFile(show))).toEqual({ ok: false, error: "このアプリで書き出したステージ設定ではありません" });
    expect(applyStageFile(show, { ...asFile(stageFileOf(show)) as object, version: 2 }).ok).toBe(false);
    const broken = { ...asFile(stageFileOf(show)) as object, stageParts: [{ id: "x", type: "spaceship" }] };
    const r = applyStageFile(show, broken);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/^stageParts\.0\./);
  });
});
