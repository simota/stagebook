import { parseShow, type ParseResult, type Show } from "./model/show";

const PREFIX = "#show=";

async function pipe(bytes: Uint8Array<ArrayBuffer>, stream: CompressionStream | DecompressionStream): Promise<Uint8Array<ArrayBuffer>> {
  const out = new Blob([bytes]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

/**
 * The show travels in the URL fragment, gzip-compressed. Fragments are not sent to the server, so the data goes
 * only to whoever receives the link. The ticket reservations are left out: they are guests' names, and a link is
 * typically passed to venue staff and other bands.
 */
export async function shareHash(show: Show): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify({ ...show, reservations: [] }));
  return PREFIX + toBase64Url(await pipe(json, new CompressionStream("gzip")));
}

/** null when the hash is not a share link; otherwise the validated show or why it could not be read. */
export async function showFromHash(hash: string): Promise<ParseResult | null> {
  if (!hash.startsWith(PREFIX)) return null;
  try {
    const json = await pipe(fromBase64Url(hash.slice(PREFIX.length)), new DecompressionStream("gzip"));
    return parseShow(JSON.parse(new TextDecoder().decode(json)));
  } catch {
    return { ok: false, error: "共有リンクが途中で切れているか、壊れています。リンク全体をコピーし直してもらってください" };
  }
}
