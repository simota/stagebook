import type { Backup } from "./model/backup";
import { showTitle } from "./model/derive";
import type { Show } from "./model/show";
import { stageFileOf } from "./model/stageFile";

const safeName = (s: string) => s.replace(/[\\/:*?"<>|\s]+/g, "_");

function downloadJson(name: string, data: unknown) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function downloadShowJson(show: Show): string {
  const name = `${safeName(showTitle(show))}.json`;
  downloadJson(name, show);
  return name;
}

export function downloadBackup(backup: Backup): string {
  const name = `setlist-backup_${backup.exportedAt.slice(0, 10)}.json`;
  downloadJson(name, backup);
  return name;
}

export function downloadStageFile(show: Show): string {
  const name = `${safeName(show.meta.band || "無題")}_ステージ設定.json`;
  downloadJson(name, stageFileOf(show));
  return name;
}
