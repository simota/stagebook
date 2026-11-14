import { useRef, useState } from "react";
import { parseShowText, serializeShowText, type TextError } from "../model/text";
import { useShowStore } from "../store/showStore";

const HELP = `# バンド名
公演: / 会場: / 日付: / 出番: / 持ち時間:（分） / 開始: 19:30 / 連絡先:

## セットリスト
SE: タイトル | 1:30 | つなぎ
1. 曲名 | BPM | キー | 尺 | つなぎ   （| の後ろは省略・順不同）
曲名だけの行も曲になる（番号なしの一覧をそのまま貼り付けられる）
  > 注釈
  原曲: アーティスト名（カバーのとき）
  照明: 色 色 / 雰囲気 / 明るさ / 動き / きっかけ
  音響: コーラスやソロの担当など
MC: タイトル | 1:00
転換: … / メモ: …
--- ENCORE ---

## 全般
照明: … / 音響: … / 同期: …（次の行を字下げすると続きになる）

色: 赤 橙 黄 緑 青 紫 白 お任せ　明るさ: 暗 中 明
動き: なし ゆっくり 速い 曲に合わせる`;

export function TextEditor() {
  const showId = useShowStore((s) => s.show.id);
  return <TextEditorBody key={showId} />;
}

function TextEditorBody() {
  const show = useShowStore((s) => s.show);
  const update = useShowStore((s) => s.update);
  const draft = useShowStore((s) => s.textDraft);
  const setDraft = useShowStore((s) => s.setTextDraft);
  const [errors, setErrors] = useState<TextError[]>([]);
  const [applied, setApplied] = useState(false);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const formText = serializeShowText(show);
  const text = draft?.text ?? formText;
  const dirty = text !== formText;
  const formChanged = dirty && draft !== null && draft.base !== formText;

  const apply = () => {
    const r = parseShowText(text, show);
    setApplied(r.ok);
    if (!r.ok) return setErrors(r.errors);
    setErrors([]);
    setDraft(null);
    update((d) => {
      d.meta = r.show.meta;
      d.items = r.show.items;
      d.general = r.show.general;
    });
  };

  const jumpTo = (line: number) => {
    const area = areaRef.current!;
    const lines = text.split("\n");
    const start = lines.slice(0, line - 1).reduce((n, l) => n + l.length + 1, 0);
    area.focus();
    area.setSelectionRange(start, start + lines[line - 1].length);
  };

  return (
    <div className="panel text-editor">
      <p className="hint">
        基本情報・セットリスト・音響照明をテキストでまとめて書けます。メンバー・ステージ図・機材は対象外で、反映しても変わりません。
      </p>
      <div className="line">
        <button type="button" className="primary" onClick={apply} disabled={!dirty}>フォームに反映（⌘/Ctrl+Enter）</button>
        <button type="button" onClick={() => { setDraft(null); setErrors([]); setApplied(false); }} disabled={!dirty}>
          フォームの内容に戻す
        </button>
        <span className="hint">{dirty ? "未反映の変更があります" : applied ? "反映しました" : "フォームと同じ内容です"}</span>
      </div>
      {formChanged && (
        <p className="text-stale" role="status">
          このテキストを書き始めた後に、ほかのタブでフォームが変更されています。反映すると、その変更はこのテキストの内容で上書きされます（元に戻すで取り消せます）。
        </p>
      )}
      {errors.length > 0 && (
        <ul className="text-errors" role="alert">
          {errors.map((e) => (
            <li key={`${e.line}-${e.message}`}>
              <button type="button" className="link" onClick={() => jumpTo(e.line)}>{e.line}行目</button> {e.message}
            </li>
          ))}
        </ul>
      )}
      <textarea ref={areaRef} className="text-area" spellCheck={false} value={text} aria-label="テキストで編集"
        onChange={(e) => { setDraft({ text: e.target.value, base: draft?.base ?? formText }); setApplied(false); }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            apply();
          }
        }} />
      <details className="text-help">
        <summary>書き方</summary>
        <pre>{HELP}</pre>
      </details>
    </div>
  );
}
