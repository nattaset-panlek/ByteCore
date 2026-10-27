import { useState } from "react";
import { GAME_DAY_MS, INCOME_PAYOUT_MS } from "../game/balance";
import { incomePerHour } from "../game/state";
import { useGame } from "../game/store";
import type { Txn } from "../game/types";
import { Card, ComboBox, StatCard } from "../ui";
import { fmt, t, useT } from "../i18n";
import { credits, dateTime, duration, EmptyState, LinkButton, NavApp, NavHeader, Section, signedCredits, useNow, usePages } from "./common";

type Page = "overview" | "transactions";
const NAV: { id: Page; label: string; icon: string }[] = [
  { id: "overview", label: "wallet.nav.overview", icon: "icon/home" },
  { id: "transactions", label: "wallet.nav.transactions", icon: "icon/table" },
];

const KINDS: Txn["kind"][] = ["sale", "purchase", "mining", "bail", "interest", "refund", "proxy"];
const category = (k: Txn["kind"]) => t(`wallet.category.${k}`);
/** Transaction label: an i18n key with vars (old saves: plain text, shown as is). */
const txnLabel = (x: Txn) => t(x.label, x.vars);

const BUCKETS = 12;
const BUCKET_MS = GAME_DAY_MS;

/** Wallet: balance, income per hour, activity chart, transactions. */
export function Wallet() {
  const t = useT();
  const pages = usePages<Page>("overview");
  const [find, setFind] = useState("");
  const name = useGame((s) => s.game.player.name);
  const createdAt = useGame((s) => s.game.createdAt);
  const id = String(createdAt).slice(-12).replace(/(\d{4})(?=\d)/g, "$1-");
  return (
    <NavApp
      header={<NavHeader initials={name.slice(0, 2).toUpperCase()} title={t("wallet.title", { name })} caption={t("wallet.id", { id })} />}
      search={{
        value: find,
        onChange: (v) => {
          setFind(v);
          if (v) pages.go("transactions");
        },
        placeholder: t("wallet.search"),
      }}
      items={NAV.map((n) => ({ ...n, label: t(n.label) }))}
      pages={pages}
      title={pages.page === "transactions" ? t("wallet.nav.transactions") : undefined}
    >
      {pages.page === "overview" ? <Overview showAll={() => pages.go("transactions")} /> : <Transactions find={find} />}
    </NavApp>
  );
}

function Overview({ showAll }: { showAll: () => void }) {
  const t = useT();
  const g = useGame((s) => s.game);
  const now = useNow();
  const perHour = incomePerHour(g);
  const dayAgo = now - 24 * 3600_000;
  const recent = g.txns.filter((x) => x.at >= dayAgo);
  const income = recent.filter((x) => x.amount > 0).reduce((s, x) => s + x.amount, 0);
  const spending = recent.filter((x) => x.amount < 0).reduce((s, x) => s - x.amount, 0);
  const transit = g.orders.filter((o) => !o.cancelled && now < o.arrivesAt);
  const nextPayout = INCOME_PAYOUT_MS - (now - g.wallet.lastPayoutAt);

  return (
    <>
      <div className="wallet-hero">
        <span className="t-body c-secondary">{t("wallet.totalBalance")}</span>
        <span className="t-title-large">{credits(g.wallet.balance)}</span>
        {g.wallet.debt > 0 ? (
          <span className="t-caption c-critical">{t("wallet.debt", { amount: credits(g.wallet.debt) })}</span>
        ) : (
          <span className="t-caption c-success">{t("wallet.perHour", { amount: signedCredits(perHour) })}</span>
        )}
      </div>
      <div className="stat-row">
        <StatCard icon="icon/arrow_download" label={t("wallet.income")} value={credits(income)} sub={t("wallet.last24h")} />
        <StatCard icon="icon/share" label={t("wallet.spending")} value={credits(spending)} sub={t("wallet.last24h")} />
        <StatCard
          icon="icon/arrow_clockwise"
          label={t("wallet.inTransit")}
          value={credits(transit.reduce((s, o) => s + o.price, 0))}
          sub={t("wallet.orders", { count: transit.length })}
        />
        <StatCard icon="icon/settings" label={t("wallet.miningPayout")} value={t("wallet.perHourShort", { amount: credits(perHour) })} sub={t("wallet.nextIn", { time: duration(nextPayout).slice(3) })} />
      </div>
      <Card>
        <Activity txns={g.txns} now={now} />
      </Card>
      <Section title={t("wallet.recent")} action={<LinkButton onClick={showAll}>{t("wallet.viewAll")}</LinkButton>}>
        <TxnTable txns={g.txns.slice(0, 6)} />
      </Section>
    </>
  );
}

function Activity({ txns, now }: { txns: Txn[]; now: number }) {
  const t = useT();
  const end = Math.ceil(now / BUCKET_MS) * BUCKET_MS;
  const buckets = Array.from({ length: BUCKETS }, (_, i) => {
    const from = end - (BUCKETS - i) * BUCKET_MS;
    const inB = txns.filter((x) => x.at >= from && x.at < from + BUCKET_MS);
    return {
      label: fmt.time(from + BUCKET_MS),
      income: inB.filter((x) => x.amount > 0).reduce((s, x) => s + x.amount, 0),
      spending: inB.filter((x) => x.amount < 0).reduce((s, x) => s - x.amount, 0),
    };
  });
  const max = Math.max(1, ...buckets.map((b) => Math.max(b.income, b.spending)));
  return (
    <div className="chart">
      <div className="app-section-head">
        <span className="t-body-strong">{t("wallet.activity")}</span>
        <div className="chart-legend">
          <span>
            <i style={{ background: "var(--accent)" }} />
            {t("wallet.income")}
          </span>
          <span>
            <i style={{ background: "var(--rarity-epic)" }} />
            {t("wallet.spending")}
          </span>
        </div>
      </div>
      <div className="chart-plot">
        {buckets.map((b) => (
          <div className="chart-group" key={b.label} title={`${b.label}: +${fmt.number(b.income)} / -${fmt.number(b.spending)}`}>
            <div className="chart-bars">
              <i style={{ height: `${(b.income / max) * 100}%`, background: "var(--accent)" }} />
              <i style={{ height: `${(b.spending / max) * 100}%`, background: "var(--rarity-epic)" }} />
            </div>
          </div>
        ))}
      </div>
      <div className="chart-labels">
        {buckets.map((b) => (
          <span key={b.label}>{b.label}</span>
        ))}
      </div>
    </div>
  );
}

const COLS = { gridTemplateColumns: "20px 1fr 160px 110px 120px" };

function TxnTable({ txns }: { txns: Txn[] }) {
  const t = useT();
  if (txns.length === 0)
    return (
      <Card>
        <EmptyState icon="icon/wallet" title={t("wallet.noTransactions")} />
      </Card>
    );
  return (
    <div className="table">
      <div className="table-row head" style={COLS}>
        <span />
        <span>{t("wallet.col.description")}</span>
        <span>{t("wallet.col.date")}</span>
        <span>{t("wallet.col.category")}</span>
        <span className="num">{t("wallet.col.amount")}</span>
      </div>
      {txns.map((x) => (
        <div className="table-row" key={x.id} style={COLS}>
          <span className={x.amount >= 0 ? "c-success" : "c-secondary"}>{x.amount >= 0 ? "↓" : "↑"}</span>
          <span className="ellipsis">{txnLabel(x)}</span>
          <span className="c-secondary">{dateTime(x.at)}</span>
          <span className="c-secondary">{category(x.kind)}</span>
          <span className={`num ${x.amount >= 0 ? "c-success" : ""}`}>{signedCredits(x.amount)}</span>
        </div>
      ))}
    </div>
  );
}

function Transactions({ find }: { find: string }) {
  const t = useT();
  const txns = useGame((s) => s.game.txns);
  const [kind, setKind] = useState<Txn["kind"] | "all">("all");
  const q = find.toLowerCase();
  const shown = txns.filter((x) => (kind === "all" || x.kind === kind) && (!q || txnLabel(x).toLowerCase().includes(q)));
  return (
    <>
      <div className="app-section-head">
        <span className="t-body c-secondary">{t("wallet.transactionCount", { count: shown.length })}</span>
        <ComboBox
          value={kind}
          onChange={setKind}
          options={[{ value: "all" as const, label: t("wallet.allCategories") }, ...KINDS.map((k) => ({ value: k, label: category(k) }))]}
        />
      </div>
      <TxnTable txns={shown} />
    </>
  );
}
