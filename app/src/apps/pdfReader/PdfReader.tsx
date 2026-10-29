import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useGame } from "../../game/store";
import { PAGE_H, PAGE_W, paginate, parsePdf, type PdfBlock } from "../../game/pdfdoc";
import * as vfs from "../../game/vfs";
import { useT } from "../../i18n";
import { TitleBar, useWindow } from "../../os/Window";
import { Icon, IconButton } from "../../ui";
import "./pdfReader.css";

// PDF Reader (Edge-style viewer): renders an in-game .pdf (game/pdfdoc.ts) as A4 pages, with a
// Contents pane from the headings, page jump and zoom. Read-only. Launch arg `path`.

const ZOOMS = [50, 67, 75, 90, 100, 110, 125, 150, 175, 200];
const GAP = 16;

/** **bold** and `code` inside a line. */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : part.startsWith("`") && part.endsWith("`") ? (
      <code key={i}>{part.slice(1, -1)}</code>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    )
  );
}

function Block({ b }: { b: PdfBlock }) {
  switch (b.kind) {
    case "h1":
      return <h1>{inline(b.text)}</h1>;
    case "h2":
      return <h2>{inline(b.text)}</h2>;
    case "h3":
      return <h3>{inline(b.text)}</h3>;
    case "p":
      return <p>{inline(b.text)}</p>;
    case "note":
      return <div className="pdf-note">{inline(b.text)}</div>;
    case "ul":
      return (
        <ul>
          {b.items.map((it, i) => (
            <li key={i}>{inline(it)}</li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol>
          {b.items.map((it, i) => (
            <li key={i}>{inline(it)}</li>
          ))}
        </ol>
      );
    case "code":
      return <pre>{b.lines.join("\n")}</pre>;
    case "table":
      return (
        <table>
          <thead>
            <tr>
              {b.rows[0].map((c, i) => (
                <th key={i}>{inline(c)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {b.rows.slice(1).map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td key={j}>{inline(c)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    case "break":
      return null;
  }
}

export function PdfReader() {
  const t = useT();
  const { win } = useWindow();
  const path: string = win.args?.path ?? "";
  const node = useGame((s) => (path ? vfs.getNode(s.game.fs, path) : null));
  const name = path.split("/").pop() ?? "";
  const [zoom, setZoom] = useState(100);
  const [contents, setContents] = useState(true);
  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const scroller = useRef<HTMLDivElement>(null);

  const doc = useMemo(() => (node?.type === "file" ? parsePdf(node.content ?? "", name) : null), [node, name]);
  const pages = useMemo(() => (doc ? paginate(doc.blocks) : []), [doc]);
  const outline = useMemo(
    () => pages.flatMap((p, i) => p.filter((b) => b.kind === "h2" || b.kind === "h3").map((b) => ({ page: i + 1, level: b.kind, text: "text" in b ? b.text.replace(/\*\*|`/g, "") : "" }))),
    [pages]
  );
  const scale = zoom / 100;
  const pageStep = (PAGE_H * scale) + GAP;

  const goTo = (n: number) => {
    const p = Math.max(1, Math.min(pages.length, n));
    scroller.current?.scrollTo({ top: (p - 1) * pageStep, behavior: "smooth" });
    setPage(p);
    setPageInput(String(p));
  };
  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const p = Math.min(pages.length, Math.floor((el.scrollTop + el.clientHeight / 3) / pageStep) + 1);
    if (p !== page) {
      setPage(p);
      setPageInput(String(p));
    }
  };
  const zoomBy = (dir: 1 | -1) => {
    const i = ZOOMS.indexOf(zoom);
    setZoom(ZOOMS[Math.max(0, Math.min(ZOOMS.length - 1, (i < 0 ? ZOOMS.indexOf(100) : i) + dir))]);
  };
  const fitWidth = () => {
    const el = scroller.current;
    if (el) setZoom(Math.max(50, Math.min(200, Math.floor(((el.clientWidth - 48) / PAGE_W) * 100))));
  };

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      if (e.ctrlKey && (e.key === "=" || e.key === "+")) zoomBy(1);
      else if (e.ctrlKey && e.key === "-") zoomBy(-1);
      else if (e.key === "PageDown") goTo(page + 1);
      else if (e.key === "PageUp") goTo(page - 1);
      else return;
      e.preventDefault();
    };
    const el = scroller.current?.closest(".window") as HTMLElement | null;
    el?.addEventListener("keydown", key);
    return () => el?.removeEventListener("keydown", key);
  });

  return (
    <>
      <TitleBar title={doc?.title ? `${doc.title} - ${t("app.pdfReader")}` : t("app.pdfReader")} />
      <div className="pdf-toolbar">
        <IconButton icon="icon/table" label={t("pdf.contents")} className={contents ? "on" : ""} onClick={() => setContents(!contents)} />
        <span className="pdf-sep" />
        <input
          className="pdf-page-input"
          value={pageInput}
          aria-label={t("pdf.page")}
          onChange={(e) => setPageInput(e.target.value.replace(/\D/g, ""))}
          onKeyDown={(e) => e.key === "Enter" && goTo(Number(pageInput) || 1)}
          onBlur={() => setPageInput(String(page))}
        />
        <span className="pdf-of">{t("pdf.of", { total: pages.length })}</span>
        <span className="pdf-sep" />
        <IconButton icon="icon/subtract" label={t("pdf.zoomOut")} disabled={zoom <= ZOOMS[0]} onClick={() => zoomBy(-1)} />
        <span className="pdf-zoom">{zoom}%</span>
        <IconButton icon="icon/add" label={t("pdf.zoomIn")} disabled={zoom >= ZOOMS[ZOOMS.length - 1]} onClick={() => zoomBy(1)} />
        <IconButton icon="icon/maximize" label={t("pdf.fitWidth")} onClick={fitWidth} />
        <span className="spacer" />
        <span className="pdf-name">{name}</span>
      </div>
      <div className="pdf-main">
        {contents && doc && (
          <nav className="pdf-outline">
            <div className="pdf-outline-head">{t("pdf.contents")}</div>
            {outline.length === 0 && <div className="pdf-outline-empty">{t("pdf.noContents")}</div>}
            {outline.map((o, i) => (
              <button type="button" key={i} className={`pdf-outline-item ${o.level} ${o.page === page ? "on" : ""}`} onClick={() => goTo(o.page)}>
                <span>{o.text}</span>
                <span className="pdf-outline-page">{o.page}</span>
              </button>
            ))}
          </nav>
        )}
        <div className="pdf-scroll" ref={scroller} onScroll={onScroll} tabIndex={0}>
          {!doc ? (
            <div className="pdf-error">
              <Icon name="app/PdfReader" size={48} />
              <div>{t("pdf.missing", { path: path || "-" })}</div>
            </div>
          ) : (
            pages.map((blocks, i) => (
              <div key={i} className="pdf-page-slot" style={{ width: PAGE_W * scale, height: PAGE_H * scale, marginBottom: GAP }}>
                <article className="pdf-page" style={{ width: PAGE_W, height: PAGE_H, transform: `scale(${scale})` }}>
                  <div className="pdf-page-body">
                    {blocks.map((b, j) => (
                      <Block key={j} b={b} />
                    ))}
                  </div>
                  <footer className="pdf-page-foot">
                    <span>{doc.title}</span>
                    <span>{t("pdf.pageOf", { n: i + 1, total: pages.length })}</span>
                  </footer>
                </article>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
