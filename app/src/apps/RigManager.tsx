import { useEffect, useRef, useState } from "react";
import { getModel, SHOP_PARTS } from "../game/catalog";
import { orderStage } from "../game/loop";
import { rigStats, SLOTS } from "../game/rig";
import { moduleFilesOnDrive, MODULES, MODULE_SLOTS } from "../game/modules";
import { diskUsage, useGame, type Result } from "../game/store";
import type { Order, PartKind } from "../game/types";
import * as vfs from "../game/vfs";
import { useWindow } from "../os/Window";
import { useWindows } from "../os/windowStore";
import { Badge, Button, Card, Icon, InfoBar, KeyValue, Meter, StatCard } from "../ui";
import { urls } from "./browser/routes";
import { credits, duration, EmptyState, fileSize, LinkButton, NavApp, NavHeader, PART_ICON, Section, slotLabel, stageLabel, useNow, usePages } from "./common";
import { appName } from "../os/apps";
import { fmt, t, tm, useT } from "../i18n";
import { TuningPage } from "./gameplay/TuningPage";
import { skillEffects } from "../game/skills";

type Page = "overview" | "hardware" | "tuning" | "modules" | "deliveries" | "storage";
const NAV: { id: Page; label: string; icon: string }[] = [
  { id: "overview", label: "rig.nav.overview", icon: "icon/home" },
  { id: "hardware", label: "rig.nav.hardware", icon: "icon/developer_board" },
  { id: "tuning", label: "rig.nav.tuning", icon: "icon/power" },
  { id: "modules", label: "rig.modules", icon: "icon/save" },
  { id: "deliveries", label: "rig.nav.deliveries", icon: "icon/arrow_download" },
  { id: "storage", label: "rig.nav.storage", icon: "icon/database" },
];

export function netSpeed(mbps: number): string {
  if (mbps >= 1000) return t("common.speedGbps", { n: fmt.number(mbps / 1000, 3) });
  if (mbps < 1) return t("common.speedKbps", { n: Math.round(mbps * 1000) });
  return t("common.speedMbps", { n: fmt.number(mbps, 3) });
}

const openBrowser = (url: string) => useWindows.getState().open("browser", { url });

/** Rig Manager (GDD 3.7): rig overview, Install / Replace delivered parts, track deliveries, storage. Launch arg `page`. */
export function RigManager() {
  const t = useT();
  const { win } = useWindow();
  const pages = usePages<Page>((win.args?.page as Page) ?? "overview");
  const [find, setFind] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const tier = useGame((s) => rigStats(s.game.rig).tier);

  // Re-opening with a page arg (delivery toast, My orders) switches page.
  const seen = useRef(win.args?.nonce);
  useEffect(() => {
    if (win.args?.nonce === seen.current) return;
    seen.current = win.args?.nonce;
    if (win.args?.page) pages.go(win.args.page as Page);
  });

  const report = (r: Result, okText: string) => setMessage(r.ok ? { ok: true, text: okText } : { ok: false, text: tm(r.error) });
  const nav = NAV.map((n) => ({ ...n, label: t(n.label) }));
  const items = nav.filter((n) => n.label.toLowerCase().includes(find.toLowerCase()));

  return (
    <NavApp
      header={<NavHeader icon="app/RigManager" title="XEA-RIG-01" caption={t("rig.customRig", { tier })} />}
      search={{ value: find, onChange: setFind, placeholder: t("rig.find") }}
      items={items}
      pages={pages}
      title={nav.find((n) => n.id === pages.page)!.label}
    >
      {message && (
        <InfoBar
          severity={message.ok ? "success" : "error"}
          title={message.ok ? t("common.done") : t("common.failed")}
          message={message.text}
          onClose={() => setMessage(null)}
        />
      )}
      {pages.page === "overview" && <Overview go={pages.go} report={report} />}
      {pages.page === "hardware" && <SlotGrid report={report} />}
      {pages.page === "tuning" && <TuningPage />}
      {pages.page === "modules" && <Modules report={report} />}
      {pages.page === "deliveries" && <Deliveries report={report} />}
      {pages.page === "storage" && <StorageCard detailed />}
    </NavApp>
  );
}

type Report = (r: Result, okText: string) => void;

function Overview({ go, report }: { go: (p: Page) => void; report: Report }) {
  const t = useT();
  const g = useGame((s) => s.game);
  const now = useNow();
  const stats = rigStats(g.rig);
  const disk = diskUsage(g);
  const ready = g.orders.filter((o) => !o.cancelled && !o.claimed && now >= o.arrivesAt);
  const model = (k: PartKind) => (g.rig[k] ? getModel(g.rig[k]!.modelId) : null);
  return (
    <>
      <div className="stat-row">
        <StatCard icon="icon/developer_board" label={t("rig.processing")} value={t("rig.ghz", { n: fmt.number(stats.cpu, 1) })} sub={model("cpu")?.spec ?? t("rig.noCpu")} />
        <StatCard icon="icon/table" label={t("rig.memory")} value={t("common.sizeGB", { size: stats.ramGB })} sub={model("ram")?.name ?? t("rig.noRam")} />
        <StatCard icon="icon/database" label={t("rig.storage")} value={t("common.sizeGB", { size: stats.diskGB })} sub={t("rig.free", { size: fileSize(disk.total - disk.used) })} />
        <StatCard icon="icon/globe" label={t("rig.network")} value={netSpeed(stats.netMbps)} sub={model("net")?.name ?? t("rig.noNet")} />
      </div>
      {ready.length > 0 && (
        <InfoBar
          severity="success"
          title={t("event.delivered.title")}
          message={ready.length === 1 ? t("rig.readyOne", { name: getModel(ready[0].modelId).name }) : t("rig.readyMany", { count: ready.length })}
          action={<Button onClick={() => go("deliveries")}>{t("rig.view")}</Button>}
        />
      )}
      <Section title={t("rig.nav.hardware")} action={<LinkButton onClick={() => useWindows.getState().open("rigStock")}>{t("toast.openApp", { app: appName("rigStock") })}</LinkButton>}>
        <SlotGrid report={report} />
      </Section>
      <Section title={t("rig.nav.storage")} action={<LinkButton onClick={() => useWindows.getState().open("explorer")}>{t("toast.openApp", { app: appName("explorer") })}</LinkButton>}>
        <StorageCard />
      </Section>
    </>
  );
}

function SlotGrid({ report }: { report: Report }) {
  useT();
  return (
    <div className="card-grid">
      {SLOTS.map((s) => (
        <SlotCard key={s.kind} kind={s.kind} label={slotLabel(s.kind)} report={report} />
      ))}
    </div>
  );
}

function SlotCard({ kind, label, report }: { kind: PartKind; label: string; report: Report }) {
  const t = useT();
  const part = useGame((s) => s.game.rig[kind]);
  const orders = useGame((s) => s.game.orders);
  const claimOrder = useGame((s) => s.claimOrder);
  const now = useNow();
  const model = part ? getModel(part.modelId) : null;
  const mine = orders.filter((o) => !o.cancelled && !o.claimed && getModel(o.modelId).kind === kind);
  const delivered = mine.find((o) => now >= o.arrivesAt);
  const coming = mine.filter((o) => now < o.arrivesAt).sort((a, b) => a.arrivesAt - b.arrivesAt)[0];
  const next = SHOP_PARTS.filter((p) => p.kind === kind && p.value > (model?.value ?? 0)).sort((a, b) => a.price - b.price)[0];

  return (
    <Card>
      <div className="part-head">
        <span className="part-icon">
          <PartIcon kind={kind} />
        </span>
        <div className="part-title">
          <span className="t-body-strong">{label}</span>
          <span className="t-caption c-secondary">{model ? t("common.tierName", { tier: model.tier, name: model.name }) : t("rig.emptySlot")}</span>
        </div>
        {delivered ? (
          <Badge tone="success">{stageLabel(3)}</Badge>
        ) : coming ? (
          <Badge tone="caution">{stageLabel(orderStage(coming, now))}</Badge>
        ) : model ? (
          <span className="status-dot c-accent">{t("rig.installed")}</span>
        ) : null}
      </div>
      <div className="part-kvs">
        <KeyValue k={t("rig.spec")} v={model?.spec ?? "-"} />
        <KeyValue k={t("rig.condition")} v={part ? `${part.condition}%` : "-"} />
      </div>
      {delivered ? (
        <div className="part-foot">
          <div className="part-foot-text">
            <span className="t-caption c-secondary">{getModel(delivered.modelId).name}</span>
            <span className="t-body-strong">{model ? t("rig.oldToStock") : t("rig.readyToInstall")}</span>
          </div>
          <Button
            variant="accent"
            onClick={() => report(claimOrder(delivered.id, "rig"), t("rig.installedMsg", { name: getModel(delivered.modelId).name }))}
          >
            {model ? t("rig.replace") : t("rig.install")}
          </Button>
        </div>
      ) : coming ? (
        <div className="part-foot">
          <div className="part-foot-text">
            <span className="t-caption c-secondary">{t("rig.arrivesIn")}</span>
            <span className="t-body-strong">{duration(coming.arrivesAt - now)}</span>
          </div>
          <Button onClick={() => openBrowser(urls.orders())}>{t("rig.track")}</Button>
        </div>
      ) : (
        <div className="part-foot">
          <div className="part-foot-text">
            <span className="t-caption c-secondary">{next ? t("rig.nextUpgrade") : t("rig.topTier")}</span>
            <span className="t-body-strong">{next ? credits(next.price) : "-"}</span>
          </div>
          <Button onClick={() => openBrowser(urls.builder(kind))}>{t("rig.shop")}</Button>
        </div>
      )}
    </Card>
  );
}

function PartIcon({ kind }: { kind: PartKind }) {
  return <Icon name={PART_ICON[kind]} size={20} />;
}

function Deliveries({ report }: { report: Report }) {
  const t = useT();
  const orders = useGame((s) => s.game.orders);
  const rig = useGame((s) => s.game.rig);
  const claimOrder = useGame((s) => s.claimOrder);
  const now = useNow();
  const open = orders.filter((o) => !o.cancelled && !o.claimed);
  if (open.length === 0)
    return (
      <Card>
        <EmptyState icon="icon/arrow_download" title={t("rig.noDeliveries")} text={t("rig.noDeliveriesText")} />
        <Button onClick={() => openBrowser(urls.builder())} style={{ alignSelf: "center" }}>
          {t("rig.openBuilder")}
        </Button>
      </Card>
    );
  const row = (o: Order) => {
    const m = getModel(o.modelId);
    const stage = orderStage(o, now);
    const name = m.name;
    return (
      <div className="table-row" key={o.id} style={{ gridTemplateColumns: "32px 1fr 140px 240px" }}>
        <PartIcon kind={m.kind} />
        <div className="ellipsis">
          <div>{name}</div>
          <div className="t-caption c-secondary">
            {t("common.tierName", { tier: m.tier, name: credits(o.price) })}
          </div>
        </div>
        {stage === 3 ? (
          <span className="c-success t-caption">{stageLabel(3)}</span>
        ) : (
          <span className="t-caption">
            {stageLabel(stage)} · <span className="c-caution">{duration(o.arrivesAt - now)}</span>
          </span>
        )}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          {stage === 3 ? (
            <>
              <Button onClick={() => report(claimOrder(o.id, "stock"), t("rig.movedToStock", { name }))}>{t("rig.toStock")}</Button>
              <Button variant="accent" onClick={() => report(claimOrder(o.id, "rig"), t("rig.installedMsg", { name }))}>
                {rig[m.kind] ? t("rig.replace") : t("rig.install")}
              </Button>
            </>
          ) : (
            <Button onClick={() => openBrowser(urls.orders())}>{t("rig.track")}</Button>
          )}
        </div>
      </div>
    );
  };
  return (
    <div className="table">
      <div className="table-row head" style={{ gridTemplateColumns: "32px 1fr 140px 240px" }}>
        <span />
        <span>{t("rig.col.part")}</span>
        <span>{t("rig.col.status")}</span>
        <span className="num">{t("rig.col.action")}</span>
      </div>
      {open.sort((a, b) => a.arrivesAt - b.arrivesAt).map(row)}
    </div>
  );
}

function Modules({ report }: { report: Report }) {
  const installed = useGame((s) => s.game.modules);
  const fs = useGame((s) => s.game.fs);
  const loadModule = useGame((s) => s.loadModule);
  const unloadModule = useGame((s) => s.unloadModule);
  const onDrive = moduleFilesOnDrive(fs).filter(({ file }) => !installed.includes(file.module!));

  const effect = (id: string) => {
    const m = MODULES[id];
    return m ? t(`rig.modules.effect.${m.kind}`, { pct: Math.round(m.pct * 100) }) : "";
  };

  return (
    <>
      <Section title={t("rig.modules.installed")} action={<span className="t-caption c-secondary">{t("rig.modules.slots", { used: installed.length, max: MODULE_SLOTS + skillEffects(useGame.getState().game.player.skills).moduleSlots })}</span>}>
        {installed.length === 0 ? (
          <Card>
            <EmptyState icon="icon/save" title={t("rig.modules.empty")} />
          </Card>
        ) : (
          <div className="card-grid">
            {installed.map((id) => (
              <Card key={id}>
                <div className="part-head">
                  <span className="part-icon">
                    <Icon name="icon/save" size={20} />
                  </span>
                  <div className="part-title">
                    <span className="t-body-strong">{t(`module.${id}`)}</span>
                    <span className="t-caption c-success">{effect(id)}</span>
                  </div>
                </div>
                <div className="part-actions">
                  <Button onClick={() => unloadModule(id)}>{t("rig.modules.remove")}</Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Section>
      <Section title={t("rig.modules.available")}>
        {onDrive.length === 0 ? (
          <Card>
            <span className="t-caption c-secondary">{t("rig.modules.noneOnDrive")}</span>
          </Card>
        ) : (
          <div className="card-grid">
            {onDrive.map(({ path, file }) => (
              <Card key={path}>
                <div className="part-head">
                  <span className="part-icon">
                    <Icon name="icon/save" size={20} />
                  </span>
                  <div className="part-title">
                    <span className="t-body-strong">{t(`module.${file.module}`)}</span>
                    <span className="t-caption c-secondary">{effect(file.module!)}</span>
                  </div>
                </div>
                <div className="part-actions">
                  <Button variant="accent" onClick={() => report(loadModule(path), t("rig.modules.install"))}>
                    {t("rig.modules.install")}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}

function StorageCard({ detailed }: { detailed?: boolean }) {
  const t = useT();
  const g = useGame((s) => s.game);
  const { used, total } = diskUsage(g);
  const pct = total ? used / total : 1;
  const folders = vfs
    .list(g.fs, "C:/")
    .map((n) => ({ name: n.name, size: vfs.sizeOf(n) }))
    .sort((a, b) => b.size - a.size);
  return (
    <Card>
      <Meter
        label={t("rig.diskUsed", { used: fileSize(used), total: fileSize(total) })}
        value={pct}
        tone={pct > 0.9 ? "critical" : pct > 0.75 ? "caution" : "accent"}
      />
      {(detailed ? folders : folders.slice(0, 3)).map((f) => (
        <KeyValue key={f.name} k={`C:/${f.name}`} v={fileSize(f.size)} />
      ))}
    </Card>
  );
}
