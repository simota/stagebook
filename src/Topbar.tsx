import { useEffect, useRef } from "react";
import { downloadBackup, downloadShowJson } from "./download";
import { shareHash, showFromHash } from "./share";
import { makeBackup } from "./store/persistence";
import { useShowStore } from "./store/showStore";

/** Choosing, creating and deleting shows, undo, and moving shows in and out (files and share links). */
export function Topbar() {
  const show = useShowStore((s) => s.show);
  const index = useShowStore((s) => s.index);
  const canUndo = useShowStore((s) => s.past.length > 0);
  const canRedo = useShowStore((s) => s.future.length > 0);
  const { openShow, createShow, deleteCurrent, importFile, openShared, setNotice, undo, redo } = useShowStore.getState();
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fromLink = async () => {
      const r = await showFromHash(location.hash);
      if (!r) return;
      history.replaceState(null, "", location.pathname + location.search);
      if (r.ok) openShared(r.show);
      else setNotice({ kind: "error", text: r.error });
    };
    void fromLink();
    window.addEventListener("hashchange", fromLink);
    return () => window.removeEventListener("hashchange", fromLink);
  }, [openShared, setNotice]);

  const copyShareLink = async () => {
    let url: string;
    try {
      url = location.origin + location.pathname + (await shareHash(show));
    } catch (e) {
      return setNotice({ kind: "error", text: `共有リンクを作れませんでした（${(e as Error).name}）。このブラウザが圧縮に対応していない可能性があります。「JSON書き出し」したファイルを渡してください` });
    }
    try {
      await navigator.clipboard.writeText(url);
      setNotice({ kind: "info", text: `共有リンクをコピーしました（${url.length.toLocaleString()} 文字）。開いた人のブラウザに、この公演が新しい公演として追加されます。連絡先を含む公演の内容がリンクに入るので、渡す相手に注意してください（取り置きリストは入りません）` });
    } catch {
      setNotice({ kind: "error", text: "クリップボードにコピーできませんでした。ブラウザがクリップボードへのアクセスを許可しているか確認してください" });
    }
  };

  return (
    <header className="topbar">
      <h1 className="brand">Stagebook</h1>
      <label className="show-picker">
        <span className="visually-hidden">公演を選ぶ</span>
        <select value={show.id} onChange={(e) => openShow(e.target.value)}>
          {index.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>
      </label>
      <div className="group" role="group" aria-label="公演">
        <button type="button" onClick={() => createShow("empty")}>新規</button>
        <button type="button" onClick={() => createShow("duplicate")}>複製</button>
        <button type="button" onClick={() => createShow("sample")}>サンプル</button>
        <button type="button" className="danger" onClick={() => {
          if (window.confirm(`「${show.meta.band || "無題"}」の公演を削除しますか？（元に戻せません）`)) deleteCurrent();
        }}>削除</button>
      </div>
      <div className="group" role="group" aria-label="編集の取り消し">
        <button type="button" onClick={undo} disabled={!canUndo} title="⌘/Ctrl+Z">元に戻す</button>
        <button type="button" onClick={redo} disabled={!canRedo} title="⌘/Ctrl+Shift+Z">やり直す</button>
      </div>
      <span className="spacer" />
      <div className="group" role="group" aria-label="ファイル">
        <button type="button" onClick={() => setNotice({ kind: "info", text: `「${downloadShowJson(show)}」を書き出しました` })}>JSON書き出し</button>
        <button type="button" onClick={() => fileRef.current!.click()} title="1公演のJSONと、全公演のバックアップのどちらも読み込めます">JSON読み込み</button>
        <button type="button" onClick={() => setNotice({ kind: "info", text: `全 ${index.length} 件の公演を「${downloadBackup(makeBackup(index))}」に保存しました。別の端末では「JSON読み込み」で復元できます` })}>
          全公演をバックアップ
        </button>
        <button type="button" onClick={() => void copyShareLink()}>共有リンクをコピー</button>
      </div>
      <input ref={fileRef} type="file" accept="application/json,.json" hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void importFile(f);
          e.target.value = "";
        }} />
    </header>
  );
}
