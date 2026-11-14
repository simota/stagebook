import { describe, expect, it } from "vitest";
import { sampleShow } from "./model/sample";
import { shareHash, showFromHash } from "./share";

describe("share link", () => {
  it("round-trips a show through the URL fragment", async () => {
    const show = sampleShow();
    const hash = await shareHash(show);
    expect(hash).toMatch(/^#show=[A-Za-z0-9_-]+$/);
    expect(hash.length).toBeLessThan(JSON.stringify(show).length / 2);
    expect(await showFromHash(hash)).toEqual({ ok: true, show: { ...show, reservations: [] } });
  });

  it("leaves the guests' names out of the link", async () => {
    const show = sampleShow();
    expect(show.reservations.length).toBeGreaterThan(0);
    const hash = await shareHash(show);
    const json = new TextDecoder().decode(
      await new Response(new Blob([Uint8Array.from(atob(hash.slice(6).replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0))])
        .stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer(),
    );
    for (const r of show.reservations) expect(json).not.toContain(r.name);
  });

  it("ignores other fragments", async () => {
    expect(await showFromHash("")).toBeNull();
    expect(await showFromHash("#top")).toBeNull();
  });

  it("explains a truncated link instead of throwing", async () => {
    const hash = await shareHash(sampleShow());
    const r = await showFromHash(hash.slice(0, hash.length / 2));
    expect(r).toMatchObject({ ok: false, error: expect.stringContaining("切れて") });
  });
});
