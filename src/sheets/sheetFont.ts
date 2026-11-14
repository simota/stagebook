import { useSyncExternalStore, type CSSProperties } from "react";
import { SHEET_FONTS, type SheetFont, type WebFont } from "../model/fonts";

/** The device font stack used when no web font is chosen (and while one is still loading). */
const FALLBACK = `"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Yu Gothic", sans-serif`;

/** Weights the sheets draw with (sheets.css); the static fonts below ship the ones they have. */
const USED_WEIGHTS = [400, 500, 700, 800, 900];

/**
 * Each font's CSS is a separate chunk fetched only when that font is chosen. The CSS splits every weight into
 * ~120 @font-face rules by character range, so the browser downloads only the ranges the sheets actually use.
 */
const LOADERS: Record<WebFont, () => Promise<unknown>> = {
  "noto-sans": () => import("@fontsource-variable/noto-sans-jp"),
  "biz-ud": () => Promise.all([import("@fontsource/biz-udpgothic/400.css"), import("@fontsource/biz-udpgothic/700.css")]),
  "zen-maru": () => Promise.all([
    import("@fontsource/zen-maru-gothic/400.css"), import("@fontsource/zen-maru-gothic/500.css"),
    import("@fontsource/zen-maru-gothic/700.css"), import("@fontsource/zen-maru-gothic/900.css"),
  ]),
  "noto-serif": () => import("@fontsource-variable/noto-serif-jp"),
  dela: () => import("@fontsource/dela-gothic-one/400.css"),
};

/**
 * Bumped whenever font files finish loading, because text then changes size: the performer sheet includes it
 * in what it fits against, so it measures again with the real font instead of the stand-in.
 */
let fontVersion = 0;
const listeners = new Set<() => void>();
export function bumpFontVersion() {
  fontVersion++;
  for (const l of listeners) l();
}

export const useFontVersion = () =>
  useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => fontVersion);

const cssLoaded = new Map<WebFont, Promise<unknown>>();

/** Registers the font's @font-face rules (once); the files themselves load when text is laid out in it. */
export function loadSheetFont(font: SheetFont): Promise<unknown> {
  if (font === "system") return Promise.resolve();
  let p = cssLoaded.get(font);
  if (!p) {
    // Only web fonts load files, so the device font never needs to listen (or touch `document.fonts` at startup).
    if (cssLoaded.size === 0) document.fonts.addEventListener("loadingdone", bumpFontVersion);
    p = LOADERS[font]().then(bumpFontVersion, (e: unknown) => {
      cssLoaded.delete(font); // let a later attempt (e.g. back online) try again
      throw e;
    });
    cssLoaded.set(font, p);
  }
  return p;
}

/**
 * Resolves once every character of `text` can be drawn in the font at every weight the sheets use. Printing waits
 * for this: the browser would otherwise print with the stand-in font for glyphs it has not fetched yet.
 */
export async function sheetFontReady(font: SheetFont, text: string): Promise<void> {
  const { family } = SHEET_FONTS[font];
  if (!family) return;
  await loadSheetFont(font);
  await Promise.all(USED_WEIGHTS.map((w) => document.fonts.load(`${w} 16px "${family}"`, text)));
}

/** Custom properties read by `.sheet` (sheets.css); unset for the device font so it renders exactly as before. */
export function sheetFontStyle(font: SheetFont): CSSProperties | undefined {
  const { family } = SHEET_FONTS[font];
  if (!family) return undefined;
  // A web font that lacks a weight shows the nearest real one; a smeared fake bold would look worse.
  return { "--sheet-font": `"${family}", ${FALLBACK}`, "--sheet-font-synthesis": "none" } as CSSProperties;
}
