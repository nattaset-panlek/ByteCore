import { useState } from "react";
import { TIER_UNLOCK_LEVEL } from "../../game/balance";
import { useGame } from "../../game/store";
import { useT } from "../../i18n";
import { Icon, RarityLabel } from "../../ui";
import { lootRarity } from "../../game/network";
import * as vfs from "../../game/vfs";
import { credits, fileSize } from "../common";
import { exchangeName, NEW_TAB_URL, urls } from "./routes";

type Nav = (url: string) => void;

/** Data exchange (GDD 3.4): sell loot files. A hash sells once; copies then show ₵ 0. Its own dark brand. */
export function Exchange({ navigate }: { navigate: Nav }) {
  const t = useT();
  const fs = useGame((s) => s.game.fs);
  const sold = useGame((s) => s.game.soldHashes);
  const level = useGame((s) => s.game.player.level);
  const sellData = useGame((s) => s.sellData);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [flash, setFlash] = useState<string | null>(null);

  const files = vfs.lootFiles(fs).map(({ path, file }) => {
    const loot = file.loot!;
    const isSold = sold.includes(loot.hash);
    const locked = level < (TIER_UNLOCK_LEVEL[loot.tier] ?? 1);
    return { path, name: file.name, size: file.size, loot, isSold, locked, sellable: !isSold && !locked };
  });
  const sellable = files.filter((f) => f.sellable);
  const selected = sellable.filter((f) => sel.has(f.path));
  const total = selected.reduce((s, f) => s + f.loot.value, 0);

  const toggle = (path: string) => setSel((s) => (s.has(path) ? new Set([...s].filter((p) => p !== path)) : new Set(s).add(path)));
  const sell = (paths: string[]) => {
    if (paths.length === 0) return;
    const before = useGame.getState().game.wallet.balance;
    const r = sellData(paths);
    if (r.ok) {
      const earned = useGame.getState().game.wallet.balance - before;
      setFlash(t("exchange.flash", { count: paths.length, total: credits(earned) }));
      setSel(new Set());
    }
  };

  return (
    <div className="web exchange">
      <header className="web-header">
        <button type="button" className="web-logo" onClick={() => navigate(NEW_TAB_URL)}>
          <span className="web-logo-mark">E</span>
          {exchangeName()}
        </button>
        <span className="web-tagline">{t("exchange.tagline")}</span>
        <span className="spacer" />
        <button type="button" className="web-header-link" onClick={() => navigate(urls.category("all"))}>
          <Icon name="icon/developer_board" size={16} /> {t("exchange.toMarket")}
        </button>
      </header>
      <main className="web-main">
        <div className="web-orders-head">
          <h1 className="web-h1">{t("exchange.title")}</h1>
          <div className="exchange-actions">
            <span className="web-muted">{t("exchange.selectedLine", { count: selected.length, total: credits(total) })}</span>
            <button type="button" className="web-btn web-btn-outline" disabled={sellable.length === 0} onClick={() => sell(sellable.map((f) => f.path))}>
              {t("exchange.sellAll")}
            </button>
            <button type="button" className="web-btn web-btn-primary" disabled={selected.length === 0} onClick={() => sell(selected.map((f) => f.path))}>
              {t("exchange.sellSelected")}
            </button>
          </div>
        </div>
        {flash && <div className="exchange-flash">{flash}</div>}
        {files.length === 0 ? (
          <div className="web-panel web-empty">{t("exchange.empty")}</div>
        ) : (
          <div className="web-panel exchange-list">
            <div className="exchange-row head">
              <span />
              <span>{t("exchange.col.file")}</span>
              <span>{t("exchange.col.source")}</span>
              <span>{t("exchange.col.tier")}</span>
              <span>{t("exchange.col.rarity")}</span>
              <span className="num">{t("exchange.col.value")}</span>
              <span>{t("exchange.col.status")}</span>
            </div>
            {files.map((f) => (
              <label key={f.path} className={`exchange-row ${f.sellable ? "" : "dim"}`}>
                <input type="checkbox" disabled={!f.sellable} checked={sel.has(f.path)} onChange={() => toggle(f.path)} />
                <span className="exchange-file">
                  {f.name}
                  <span className="web-muted">{fileSize(f.size)}</span>
                </span>
                <span className="web-muted">{f.loot.source}</span>
                <span>{t("exchange.tier", { tier: f.loot.tier })}</span>
                <RarityLabel rarity={lootRarity(f.loot)} />
                <span className={`num ${f.isSold ? "web-muted" : "exchange-price"}`}>{f.isSold ? credits(0) : credits(f.loot.value)}</span>
                <span>
                  {f.isSold ? (
                    <span className="exchange-tag sold">{t("exchange.sold")}</span>
                  ) : f.locked ? (
                    <span className="exchange-tag locked">{t("exchange.locked", { level: TIER_UNLOCK_LEVEL[f.loot.tier] })}</span>
                  ) : (
                    <span className="exchange-tag ready">{t("exchange.ready")}</span>
                  )}
                </span>
              </label>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
