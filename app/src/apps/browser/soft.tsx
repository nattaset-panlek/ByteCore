import { useEffect, useState } from "react";
import { SOFT_ITEMS, softFileUrl, SOFT_URL, type SoftCategory, type SoftItem } from "../../game/appsdk/catalog";
import { DOWNLOADS_DIR } from "../../game/appsdk/installed";
import { startDownload } from "../../game/appsdk/jobs";
import { parseXjs } from "../../game/appsdk/xjs";
import { jobProgress } from "../../game/jobs";
import { useGame } from "../../game/store";
import * as vfs from "../../game/vfs";
import { t, tm, useT } from "../../i18n";
import { userAppIcon } from "../../os/userApps";
import { useWindows } from "../../os/windowStore";
import { Icon } from "../../ui";
import { credits } from "../common";
import { NEW_TAB_URL } from "./routes";
import "./soft.css";

type Nav = (url: string) => void;
const CATS: (SoftCategory | "all")[] = ["all", "games", "tools", "dev"];

/** Xea Soft (core://soft): free and paid .xjs apps. Downloads run as jobs into Downloads, like wget. */
export function SoftSite({ cat, navigate }: { cat: SoftCategory | "all"; navigate: Nav }) {
  const tr = useT();
  const [flash, setFlash] = useState<{ text: string; error?: boolean } | null>(null);
  const items = SOFT_ITEMS.filter((i) => cat === "all" || i.category === cat);
  return (
    <div className="web soft">
      <header className="web-header">
        <button type="button" className="web-logo" onClick={() => navigate(SOFT_URL)}>
          <span className="web-logo-mark">X</span>
          {tr("soft.name")}
        </button>
        <span className="web-tagline">{tr("soft.tagline")}</span>
        <span className="spacer" />
        <button type="button" className="web-header-link" onClick={() => useWindows.getState().open("explorer", { path: DOWNLOADS_DIR })}>
          <Icon name="icon/arrow_download" size={16} /> {tr("soft.openDownloads")}
        </button>
        <button type="button" className="web-header-link" onClick={() => navigate(NEW_TAB_URL)}>
          <Icon name="icon/home" size={16} />
        </button>
      </header>
      <nav className="web-cats">
        {CATS.map((c) => (
          <button type="button" key={c} className={`web-cat ${c === cat ? "on" : ""}`} onClick={() => navigate(c === "all" ? SOFT_URL : `${SOFT_URL}/c/${c}`)}>
            {c === "all" ? tr("soft.all") : tr(`soft.cat.${c}`)}
          </button>
        ))}
      </nav>
      <main className="web-main">
        <h1 className="web-h1">{tr("soft.title")}</h1>
        {flash && <div className={`soft-flash ${flash.error ? "error" : ""}`}>{flash.text}</div>}
        <div className="web-grid soft-grid">
          {items.map((i) => (
            <SoftCard key={i.id} item={i} onFlash={setFlash} />
          ))}
        </div>
        <div className="soft-info">
          <section className="web-card">
            <div className="soft-info-title">{tr("soft.howTitle")}</div>
            <div className="soft-pre">{tr("soft.how")}</div>
          </section>
          <section className="web-card">
            <div className="soft-info-title">{tr("soft.devTitle")}</div>
            <div className="soft-pre">{tr("soft.dev")}</div>
          </section>
        </div>
      </main>
    </div>
  );
}

function SoftCard({ item, onFlash }: { item: SoftItem; onFlash: (f: { text: string; error?: boolean } | null) => void }) {
  const tr = useT();
  const url = softFileUrl(item.file);
  const owned = useGame((s) => item.price === 0 || s.game.software.includes(item.id));
  const balance = useGame((s) => s.game.wallet.balance);
  const job = useGame((s) => s.game.jobs.find((j) => j.kind === "download" && j.target === url));
  const have = useGame((s) => !!vfs.getNode(s.game.fs, `${DOWNLOADS_DIR}/${item.file}`));
  const [, setPulse] = useState(0);
  useEffect(() => {
    if (!job) return;
    const id = window.setInterval(() => setPulse((n) => n + 1), 200);
    return () => window.clearInterval(id);
  }, [job]);

  const parsed = parseXjs(item.source);
  const m = parsed.ok ? parsed.app.manifest : null;
  const name = tr(`soft.item.${item.id}.name`);

  const download = () => {
    const r = startDownload(url);
    onFlash(r.ok ? null : { text: tm(r.error), error: true });
  };
  const buy = () => {
    const store = useGame.getState();
    const paid = store.spend(item.price, "txn.software", "purchase", { name });
    if (!paid.ok) return onFlash({ text: t("soft.notEnough"), error: true });
    useGame.setState((s) => ({ game: { ...s.game, software: [...s.game.software, item.id] } }));
    onFlash({ text: t("soft.bought", { name }) });
    download();
  };

  return (
    <article className="web-card soft-card">
      <div className="soft-card-head">
        <Icon name={userAppIcon(m ?? { icon: "?", color: "#7c4dff" })} size={48} />
        <div className="soft-card-title">
          <div className="web-card-name">{name}</div>
          <div className="web-card-meta">
            {item.author} · {tr(`soft.cat.${item.category}`)}
            {m ? ` · v${m.version}` : ""}
          </div>
        </div>
        <span className={`soft-price ${item.price ? "" : "free"}`}>{item.price ? credits(item.price) : tr("soft.free")}</span>
      </div>
      <div className="soft-blurb">{tr(`soft.item.${item.id}.blurb`)}</div>
      <code className="soft-wget" title={tr("soft.wget", { url })}>
        wget {url}
      </code>
      {job ? (
        <div className="soft-progress">
          <div style={{ width: `${Math.round(jobProgress(job, Date.now()) * 100)}%` }} />
          <span>{tr("soft.downloading", { pct: Math.round(jobProgress(job, Date.now()) * 100) })}</span>
        </div>
      ) : owned ? (
        <button type="button" className="web-btn web-btn-primary web-btn-block" onClick={download}>
          <Icon name="icon/arrow_download" size={16} /> {tr("soft.get")}
        </button>
      ) : (
        <button type="button" className="web-btn web-btn-primary web-btn-block" disabled={balance < item.price} onClick={buy}>
          {tr("soft.buy", { price: credits(item.price) })}
        </button>
      )}
      {(have || (item.price > 0 && owned)) && (
        <div className="web-card-meta">{[item.price > 0 && owned ? tr("soft.owned") : "", have ? tr("soft.downloaded") : ""].filter(Boolean).join(" · ")}</div>
      )}
    </article>
  );
}
