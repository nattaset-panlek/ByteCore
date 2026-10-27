import { useState } from "react";
import { useGame } from "../game/store";
import type { Contract } from "../game/types";
import { useT } from "../i18n";
import { Badge, Button, Card, Meter, StatCard } from "../ui";
import { credits, EmptyState, NavApp, NavHeader, Section, usePages } from "./common";

type Page = "available" | "active";
const NAV: { id: Page; label: string; icon: string }[] = [
  { id: "available", label: "contracts.available", icon: "icon/grid" },
  { id: "active", label: "contracts.active", icon: "icon/document" },
];

/** Contracts (GDD 4): accept a mission, progress tracked from hacking, then claim the reward. */
export function Contracts() {
  const t = useT();
  const pages = usePages<Page>("available");
  const contracts = useGame((s) => s.game.contracts);
  const [find, setFind] = useState("");

  const available = contracts.filter((c) => c.status === "available");
  const active = contracts.filter((c) => c.status === "active");
  const ready = contracts.filter((c) => c.status === "completed");

  const items = NAV.map((n) => ({ ...n, label: t(n.label) }));

  return (
    <NavApp
      header={<NavHeader icon="app/Contracts" title={t("contracts.statHeader")} caption={t("contracts.stat.available", {})} />}
      search={{ value: find, onChange: setFind, placeholder: t("contracts.available") }}
      items={items}
      pages={pages}
      title={t(NAV.find((n) => n.id === pages.page)!.label)}
    >
      <div className="stat-row">
        <StatCard icon="icon/document" label={t("contracts.stat.active")} value={String(active.length)} />
        <StatCard icon="icon/checkmark_circle" label={t("contracts.stat.ready")} value={String(ready.length)} tone={ready.length ? "success" : undefined} />
        <StatCard icon="icon/grid" label={t("contracts.stat.available")} value={String(available.length)} />
      </div>

      {pages.page === "available" ? (
        available.length === 0 ? (
          <Card>
            <EmptyState icon="icon/grid" title={t("contracts.empty.available")} />
          </Card>
        ) : (
          <div className="card-grid">
            {available.map((c) => (
              <ContractCard key={c.id} contract={c} />
            ))}
          </div>
        )
      ) : (
        <>
          {ready.length > 0 && (
            <Section title={t("contracts.completed")}>
              <div className="card-grid">
                {ready.map((c) => (
                  <ContractCard key={c.id} contract={c} />
                ))}
              </div>
            </Section>
          )}
          <Section title={t("contracts.active")}>
            {active.length === 0 ? (
              <Card>
                <EmptyState icon="icon/document" title={t("contracts.empty.active")} />
              </Card>
            ) : (
              <div className="card-grid">
                {active.map((c) => (
                  <ContractCard key={c.id} contract={c} />
                ))}
              </div>
            )}
          </Section>
        </>
      )}
    </NavApp>
  );
}

function ContractCard({ contract: c }: { contract: Contract }) {
  const t = useT();
  const accept = useGame((s) => s.acceptContract);
  const claim = useGame((s) => s.claimContract);
  const toneByTier = c.tier >= 4 ? "legendary" : c.tier >= 3 ? "epic" : c.tier >= 2 ? "rare" : "common";
  return (
    <Card>
      <div className="part-head">
        <div className="part-title">
          <span className="t-body-strong">{t(`contracts.goal.${c.goal}`, { need: c.need, tier: c.tier })}</span>
          <span className="t-caption c-secondary" style={{ color: `var(--rarity-${toneByTier})` }}>
            {t("contracts.tier", { tier: c.tier })}
          </span>
        </div>
        <Badge tone="accent">{credits(c.reward.credits)}</Badge>
      </div>
      <div className="part-kvs">
        <span className="t-caption c-secondary">
          {t("contracts.reward")}: {credits(c.reward.credits)} · {c.reward.xp} XP
        </span>
      </div>
      {c.status === "active" && <Meter value={c.need ? c.progress / c.need : 0} text={t("contracts.progress", { progress: c.progress, need: c.need })} />}
      <div className="part-actions">
        {c.status === "available" && <Button variant="accent" onClick={() => accept(c.id)}>{t("contracts.accept")}</Button>}
        {c.status === "completed" && <Button variant="accent" onClick={() => claim(c.id)}>{t("contracts.claim")}</Button>}
      </div>
    </Card>
  );
}
