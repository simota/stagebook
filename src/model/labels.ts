import type { ItemKind, LightColor } from "./show";

export const KIND_LABEL: Record<ItemKind, string> = {
  song: "曲", se: "SE", mc: "MC", change: "転換", encore: "EN", memo: "メモ",
};

export const COLOR_INFO: Record<LightColor, { name: string; fill: string }> = {
  red: { name: "赤", fill: "#e02424" },
  orange: { name: "橙", fill: "#f08a24" },
  yellow: { name: "黄", fill: "#f5d020" },
  green: { name: "緑", fill: "#2fa84f" },
  blue: { name: "青", fill: "#2563eb" },
  purple: { name: "紫", fill: "#8b3fd9" },
  white: { name: "白", fill: "#ffffff" },
  auto: { name: "お任せ", fill: "repeating-linear-gradient(45deg,#000 0 1px,#fff 1px 3px)" },
};
