import { useState } from "react";
import { getModel } from "../game/catalog";
import { resellPrice } from "../game/rig";
import { useGame, type Result } from "../game/store";
import type { Part, PartKind } from "../game/types";
import { Button, Card, ContentDialog, Icon, InfoBar, KeyValue, RarityLabel, StatCard } from "../ui";
import { credits, date, dateTime, EmptyState, NavApp, NavHeader, PART_ICON, slotLabel, usePages } from "./common";
import { appName } from "../os/apps";
import { tm, useT } from "../i18n";

type Page = "all" | PartKind | "sold";
const NAV: { id: Page; label: string; icon: string }[] = [
  { id: "all", label: "stock.nav.all", icon: "icon/grid" },
  { id: "cpu", label: "stock.nav.cpu", icon: PART_ICON.cpu },
  { id: "ram", label: "stock.nav.ram", icon: PART_ICON.ram },
  { id: "net", label: "stock.nav.net", icon: PART_ICON.net },
  { id: "disk", label: "stock.nav.disk", icon: PART_ICON.disk },
  { id: "cool", label: "rig.slot.cool", icon: PART_ICON.cool },
  { id: "sold", label: "stock.nav.sold", icon: "icon/wallet" },
];

/** Rig Stock (GDD 3.7): parts removed from the rig. Install back or sell second-hand. */
export function RigStock() {
  const t = useT();
  const pages = usePages<Page>("all");
  const [find, setFind] = useState("");
  const [tip, setTip] = useState(true);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [selling, setSelling] = useState<Part | null>(null);
  const stock = useGame((s) => s.game.stock);
  const txns = useGame((s) => s.game.txns);
  const sellFromStock = useGame((s) => s.sellFromStock);

  const sold = txns.filter((t) => t.kind === "sale");
  const report = (r: Result, okText: string) => setMessage(r.ok ? { ok: true, text: okText } : { ok: false, text: tm(r.error) });
  const q = find.toLowerCase();
  const shown = stock
    .filter((p) => pages.page === "all" || getModel(p.modelId).kind === pages.page)
    .filter((p) => !q || getModel(p.modelId).name.toLowerCase().includes(q))
    .sort((a, b) => (b.removedAt ?? 0) - (a.removedAt ?? 0));

  return (
    <NavApp
      header={<NavHeader icon="icon/square_multiple" title={appName("rigStock")} caption={t("stock.inStockCount", { count: stock.length })} />}
      search={{ value: find, onChange: setFind, placeholder: t("stock.find") }}
      items={NAV.map((n) => ({ ...n, label: t(n.label) }))}
      pages={pages}
      title={t(NAV.find((n) => n.id === pages.page)!.label)}
    >
      <div className="stat-row">
        <StatCard icon="icon/square_multiple" label={t("stock.inStock")} value={t("stock.parts", { count: stock.length })} sub={t("stock.inStockSub")} />
        <StatCard icon="icon/wallet" label={t("stock.resaleValue")} value={credits(stock.reduce((s, p) => s + resellPrice(p), 0))} sub={t("stock.resaleSub")} />
        <StatCard icon="icon/arrow_clockwise" label={t("stock.sold")} value={String(sold.length)} sub={sold.length ? t("stock.lastSold", { date: date(sold[0].at) }) : t("stock.nothingSold")} />
      </div>
      {tip && (
        <InfoBar severity="info" title={t("stock.tipTitle")} message={t("stock.tipText")} onClose={() => setTip(false)} />
      )}
      {message && (
        <InfoBar severity={message.ok ? "success" : "error"} title={message.ok ? t("common.done") : t("common.failed")} message={message.text} onClose={() => setMessage(null)} />
      )}

      {pages.page === "sold" ? (
        <SoldList />
      ) : shown.length === 0 ? (
        <Card>
          <EmptyState icon="icon/square_multiple" title={t("stock.emptyTitle")} text={t("stock.emptyText")} />
        </Card>
      ) : (
        <div className="card-grid">
          {shown.map((p) => (
            <StockCard key={p.uid} part={p} report={report} onSell={() => setSelling(p)} />
          ))}
        </div>
      )}

      <ContentDialog
        open={!!selling}
        title={t("stock.sellTitle")}
        primary={t("stock.sell")}
        onPrimary={() => {
          if (selling) report(sellFromStock(selling.uid), t("stock.soldMsg", { name: getModel(selling.modelId).name, price: credits(resellPrice(selling)) }));
          setSelling(null);
        }}
        onClose={() => setSelling(null)}
      >
        {selling && t("stock.sellText", { name: getModel(selling.modelId).name, price: credits(resellPrice(selling)) })}
      </ContentDialog>
    </NavApp>
  );
}

function StockCard({ part, report, onSell }: { part: Part; report: (r: Result, ok: string) => void; onSell: () => void }) {
  const t = useT();
  const m = getModel(part.modelId);
  const slotFilled = useGame((s) => !!s.game.rig[m.kind]);
  const installFromStock = useGame((s) => s.installFromStock);
  return (
    <Card>
      <div className="part-head">
        <span className="part-icon">
          <Icon name={PART_ICON[m.kind]} size={20} />
        </span>
        <div className="part-title">
          <span className="t-body-strong">{slotLabel(m.kind)}</span>
          <span className="t-caption c-secondary">
            {t("common.tierName", { tier: m.tier, name: m.name })}
          </span>
        </div>
        <RarityLabel rarity={m.rarity} />
      </div>
      <div className="part-kvs">
        <KeyValue k={t("stock.removed")} v={part.removedAt ? date(part.removedAt) : "-"} />
        <KeyValue k={t("stock.condition")} v={t("stock.used", { pct: part.condition })} />
        <KeyValue k={t("stock.resalePrice")} v={credits(resellPrice(part))} />
      </div>
      <div className="part-actions">
        <Button onClick={() => report(installFromStock(part.uid), t("stock.installedMsg", { name: m.name }))}>{slotFilled ? t("stock.replace") : t("stock.install")}</Button>
        <Button onClick={onSell}>{t("stock.sell")}</Button>
      </div>
    </Card>
  );
}

function SoldList() {
  const t = useT();
  const sold = useGame((s) => s.game.txns).filter((t) => t.kind === "sale");
  if (sold.length === 0)
    return (
      <Card>
        <EmptyState icon="icon/wallet" title={t("stock.nothingSold")} />
      </Card>
    );
  const cols = { gridTemplateColumns: "1fr 180px 120px" };
  return (
    <div className="table">
      <div className="table-row head" style={cols}>
        <span>{t("stock.col.part")}</span>
        <span>{t("stock.col.date")}</span>
        <span className="num">{t("stock.col.price")}</span>
      </div>
      {sold.map((x) => (
        <div className="table-row" key={x.id} style={cols}>
          <span className="ellipsis">{x.vars?.name ?? t(x.label, x.vars)}</span>
          <span className="c-secondary">{dateTime(x.at)}</span>
          <span className="num c-success">{credits(x.amount)}</span>
        </div>
      ))}
    </div>
  );
}
