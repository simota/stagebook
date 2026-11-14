/**
 * Typefaces the printed sheets can use. `family` is the CSS family of the self-hosted web font
 * (src/sheets/sheetFont.ts loads it); `system` keeps the device's own Japanese font, as before fonts were selectable.
 */
export const SHEET_FONTS = {
  system: { label: "標準（端末のフォント）", family: null },
  "noto-sans": { label: "Noto Sans JP（ゴシック）", family: "Noto Sans JP Variable" },
  "biz-ud": { label: "BIZ UDPゴシック（読みやすさ重視）", family: "BIZ UDPGothic" },
  "zen-maru": { label: "Zen Maru Gothic（丸ゴシック）", family: "Zen Maru Gothic" },
  "noto-serif": { label: "Noto Serif JP（明朝）", family: "Noto Serif JP Variable" },
  dela: { label: "Dela Gothic One（極太）", family: "Dela Gothic One" },
} as const satisfies Record<string, { label: string; family: string | null }>;

export type SheetFont = keyof typeof SHEET_FONTS;
export type WebFont = Exclude<SheetFont, "system">;

export const SHEET_FONT_IDS = Object.keys(SHEET_FONTS) as [SheetFont, ...SheetFont[]];
