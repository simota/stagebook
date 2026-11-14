# Feature map

Where each feature lives. A path that no longer exists is a bug in this file. Shared by every feature: the data
schema `src/model/show.ts`, the store `src/store/showStore.ts`, the shell `src/App.tsx` (tabs, sheets, printing).
The e2e commands build the app and serve it on 127.0.0.1:4173 with the system Chrome.

| Feature | Entry (tab / button) | Logic | Tests | Run only these |
|---|---|---|---|---|
| 基本情報・開始時刻 | `src/editor/ShowInfoForm.tsx` | `src/model/derive.ts` (`clockAt`, `itemStartLabel`) | `src/model/model.test.ts`, `e2e/features.spec.ts` | `npx vitest run src/model/model.test.ts -t timetable` · `npx playwright test e2e/features.spec.ts -g timetable` |
| セットリスト編集 | `src/editor/SetlistEditor.tsx`, `src/editor/SortableList.tsx` | `src/model/derive.ts` (`songNumbers`, `totalSec`, `parseDuration`) | `src/model/model.test.ts`, `e2e/flows.spec.ts` | `npx vitest run src/model/model.test.ts -t derive` · `npx playwright test e2e/flows.spec.ts -g "adds a song"` |
| 演者用セットリスト（文字サイズ自動調整） | `src/sheets/PerformerSetlist.tsx` | same file (`useFitText`) | `e2e/regressions.spec.ts`, `e2e/flows.spec.ts` | `npx playwright test e2e/regressions.spec.ts -g "font size"` |
| スタッフ用セットリスト | `src/sheets/StaffSetlist.tsx` | `src/model/derive.ts` | `e2e/features.spec.ts` | `npx playwright test e2e/features.spec.ts -g "start time drives"` |
| ステージ図・チャンネル表・プリセット | `src/editor/StageEditor.tsx`, `src/editor/ChannelTable.tsx`, `src/sheets/stage/StageSvg.tsx`, `src/sheets/StagePlotSheet.tsx` | `src/model/presets.ts`, `src/model/derive.ts` (`channelsByPart`, `partLabel`) | `src/model/model.test.ts`, `e2e/flows.spec.ts`, `e2e/regressions.spec.ts` | `npx vitest run src/model/model.test.ts -t "part presets"` · `npx playwright test e2e/flows.spec.ts -g "stage part"` |
| 機材・返し | `src/editor/GearEditor.tsx` | `src/model/derive.ts` (`powerTotal`) | `src/model/model.test.ts` | `npx vitest run src/model/model.test.ts -t derive` |
| メンバー | `src/editor/MembersEditor.tsx` | same file (`remove`) | `e2e/reservations.spec.ts` | `npx playwright test e2e/reservations.spec.ts -g "removing a member"` |
| 音響照明 | `src/editor/CueEditor.tsx`, `src/sheets/CueSheet.tsx` | `src/model/labels.ts` | `e2e/features.spec.ts` | `npx playwright test e2e/features.spec.ts -g "print options"` |
| 取り置き | `src/editor/ReservationEditor.tsx`, `src/sheets/ReservationSheet.tsx` | `src/model/derive.ts` (`doorList`, `reservationTotals`, `reservationText`) | `src/model/model.test.ts`, `e2e/reservations.spec.ts` | `npx vitest run src/model/model.test.ts -t reservations` · `npx playwright test e2e/reservations.spec.ts` |
| タイムテーブル（当日の流れ） | `src/editor/TimetableEditor.tsx`, `src/sheets/TimetableSheet.tsx` | `src/model/derive.ts` (`rowTimes`, `timetableTemplate`) | `src/model/model.test.ts`, `e2e/timetable.spec.ts` | `npx vitest run src/model/model.test.ts -t timetable` · `npx playwright test e2e/timetable.spec.ts` |
| テキスト入力 | `src/editor/TextEditor.tsx` | `src/model/text.ts` | `src/model/text.test.ts`, `e2e/flows.spec.ts`, `e2e/features.spec.ts` | `npx vitest run src/model/text.test.ts` |
| 曲ライブラリ | `src/editor/LibraryPanel.tsx` | `src/model/library.ts` | `src/model/library.test.ts`, `e2e/features.spec.ts` | `npx vitest run src/model/library.test.ts` |
| 印刷・表示する項目 | `src/editor/PrintOptionsPanel.tsx`, `src/sheets/common.tsx`, `src/sheets/sheets.css` | `src/model/show.ts` (`print`) | `src/model/model.test.ts`, `e2e/features.spec.ts`, `e2e/print.spec.ts` | `npx vitest run src/model/model.test.ts -t "print options"` · `npx playwright test e2e/print.spec.ts` |
| 帳票のフォント | `src/App.tsx` (picker) | `src/model/fonts.ts`, `src/sheets/sheetFont.ts` | `src/model/model.test.ts`, `e2e/fonts.spec.ts` | `npx vitest run src/model/model.test.ts -t "sheet font"` · `npx playwright test e2e/fonts.spec.ts` |
| 共有リンク | `src/Topbar.tsx` | `src/share.ts` | `src/share.test.ts`, `e2e/features.spec.ts` | `npx vitest run src/share.test.ts` · `npx playwright test e2e/features.spec.ts -g "share link"` |
| JSON 書き出し・読み込み・バックアップ | `src/Topbar.tsx`, `src/download.ts` | `src/model/backup.ts`, `src/store/persistence.ts` | `src/store/store.test.ts`, `e2e/flows.spec.ts`, `e2e/features.spec.ts` | `npx vitest run src/store/store.test.ts` · `npx playwright test e2e/features.spec.ts -g backup` |
| 自動保存・元に戻す | `src/Topbar.tsx` | `src/store/showStore.ts`, `src/store/persistence.ts` | `src/store/store.test.ts`, `e2e/flows.spec.ts` | `npx vitest run src/store/store.test.ts -t store` |
| アクセシビリティ | all of `src/editor/`, `src/app.css` | — | `e2e/a11y.spec.ts` | `npx playwright test e2e/a11y.spec.ts` |
| CSP・ライセンス表記 | `vite.config.ts`, `scripts/third-party-licenses.mjs` | — | `e2e/regressions.spec.ts`, `e2e/fonts.spec.ts` | `npx playwright test e2e/regressions.spec.ts -g CSP` · `npx playwright test e2e/fonts.spec.ts -g license` |
| OGP・メタデータ（SNS で共有したときのカード） | `index.html` (`<meta>`), `public/ogp.png` | `scripts/ogp/ogp.html`（画像の元。編集後 `node scripts/ogp/render.mjs` で描き直す） | `e2e/regressions.spec.ts` | `npx playwright test e2e/regressions.spec.ts -g "share-card"` |
| ファビコン | `index.html` (`<link rel="icon">`), `public/favicon.svg` | `scripts/icons/render.mjs`（`favicon.svg` から PNG を描き直す） | `e2e/regressions.spec.ts` | `npx playwright test e2e/regressions.spec.ts -g favicon` |
