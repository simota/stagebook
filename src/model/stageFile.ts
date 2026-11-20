import { newId, parseShow, type Show } from "./show";

/**
 * A band's stage setup on its own, to carry from one show to the next: the lineup, the stage plot, the channel
 * list, the gear and the monitor requests. The rest of a show (setlist, timetable, reservations) stays behind.
 */
const STAGE_FORMAT = "stagebook-stage";

export type StageFile = {
  format: typeof STAGE_FORMAT;
  version: 1;
  exportedAt: string;
  band: string;
} & Pick<Show, "members" | "stageParts" | "inputs" | "gear" | "monitors">;

export const stageFileOf = (show: Show): StageFile => ({
  format: STAGE_FORMAT,
  version: 1,
  exportedAt: new Date().toISOString(),
  band: show.meta.band,
  members: show.members,
  stageParts: show.stageParts,
  inputs: show.inputs,
  gear: show.gear,
  monitors: show.monitors,
});

export type StageImport = { ok: true; show: Show; addedMembers: number } | { ok: false; error: string };

/**
 * Replaces the show's stage setup with the file's. The file is checked by `parseShow` as part of the show it will
 * become. Members are matched by name, so a member already in the show keeps its id and its reservations
 * stay linked to them; a member the show does not have yet is added.
 */
export function applyStageFile(show: Show, data: unknown): StageImport {
  if (typeof data !== "object" || data === null || !("format" in data) || data.format !== STAGE_FORMAT) {
    return { ok: false, error: "このアプリで書き出したステージ設定ではありません" };
  }
  if (!("version" in data) || data.version !== 1) {
    return { ok: false, error: `対応していないステージ設定の形式です（version: ${"version" in data ? String(data.version) : "なし"}）` };
  }
  const pick = (key: string) => (key in data ? (data as Record<string, unknown>)[key] : undefined);
  const r = parseShow({
    ...show,
    members: pick("members"),
    stageParts: pick("stageParts"),
    inputs: pick("inputs"),
    gear: pick("gear"),
    monitors: pick("monitors"),
  });
  if (!r.ok) return r;

  const members: Show["members"] = [...show.members];
  const idMap = new Map<string, string>();
  for (const m of r.show.members) {
    const same = members.find((e) => e.name.trim() !== "" && e.name.trim() === m.name.trim());
    if (same) {
      idMap.set(m.id, same.id);
    } else {
      const added = { ...m, id: newId() };
      members.push(added);
      idMap.set(m.id, added.id);
    }
  }
  const member = (id: string | null) => (id === null ? null : idMap.get(id) ?? null);
  return {
    ok: true,
    addedMembers: members.length - show.members.length,
    show: {
      ...show,
      members,
      stageParts: r.show.stageParts.map((p) => ({ ...p, memberId: member(p.memberId) })),
      inputs: r.show.inputs,
      gear: r.show.gear.map((g) => ({ ...g, memberId: member(g.memberId) })),
      monitors: r.show.monitors.map((m) => ({ ...m, memberId: member(m.memberId) })),
    },
  };
}
