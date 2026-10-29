import { getModel } from "../../game/catalog";
import { rigStats } from "../../game/rig";
import { skillEffects } from "../../game/skills";
import { useGame } from "../../game/store";
import { OC_STEPS, PROFILES, profileOf, targetTemp, WEAR_PER_MIN, zone, type OcStep, type TuneProfile } from "../../game/thermal";
import { fmt, useT } from "../../i18n";
import { useWindows } from "../../os/windowStore";
import { Badge, Button, Card, InfoBar, KeyValue } from "../../ui";
import { duration, PART_ICON, useNow } from "../common";
import { netSpeed } from "../RigManager";
import { urls } from "../browser/routes";
import { Icon } from "../../ui";

// Rig Manager → Tuning (docs/gameplay-ideas.md §5): temperature, profile, per-part clocks, cooler.

const ZONE_TONE = { cool: "accent", warm: "caution", hot: "caution", critical: "critical" } as const;
const ZONE_COLOR = { cool: "var(--accent)", warm: "var(--caution)", hot: "var(--caution)", critical: "var(--critical)" } as const;

export function TuningPage() {
  const t = useT();
  const g = useGame((s) => s.game);
  const now = useNow();
  const tune = g.tuning;
  const stats = rigStats(g.rig);
  const ceiling = stats.ceiling + skillEffects(g.player.skills).coolHead;
  const z = zone(tune.temp, ceiling);
  const prof = profileOf(tune);
  const cooler = g.rig.cool ? getModel(g.rig.cool.modelId) : null;
  const off = tune.shutdownUntil && now < tune.shutdownUntil;
  const busyTemp = targetTemp(0.8, tune);
  const pct = Math.min(1, tune.temp / (ceiling + 15));

  return (
    <>
      {off ? (
        <InfoBar severity="error" title={t("tune.shutdown")} message={t("tune.shutdownText", { time: duration(tune.shutdownUntil! - now) })} />
      ) : tune.throttled ? (
        <InfoBar severity="warning" title={t("event.throttle.title")} message={t("tune.throttled")} />
      ) : null}
      <div className="tune-top">
        <Card>
          <div className="card-title">
            <span className="t-body-strong">{t("tune.temp")}</span>
            <Badge tone={ZONE_TONE[z]}>{t(`tune.zone.${z}`)}</Badge>
          </div>
          <div className="tune-temp" style={{ color: ZONE_COLOR[z] }}>
            {Math.round(tune.temp)} °C
          </div>
          <div className="kv t-caption">
            <span className="c-secondary">{t("tune.ceiling", { n: ceiling })}</span>
            <span style={{ color: ZONE_COLOR[z] }}>{Math.round(pct * 100)}%</span>
          </div>
          <div className="meter-track">
            <div className="meter-fill" style={{ width: `${pct * 100}%`, background: ZONE_COLOR[z] }} />
          </div>
          <span className="t-caption c-tertiary">{t("tune.zones", { a: ceiling - 20, b: ceiling, c: ceiling + 15 })}</span>
          <TempGraph history={tune.history} ceiling={ceiling} />
        </Card>
        <Card>
          <span className="t-body-strong">{t("tune.profile")}</span>
          <div className="segmented">
            {(Object.keys(PROFILES) as TuneProfile[]).map((p) => (
              <button type="button" key={p} className={prof === p ? "on" : ""} onClick={() => useGame.getState().setProfile(p)}>
                {t(`tune.profile.${p}`)}
              </button>
            ))}
          </div>
          <KeyValue k={t("tune.jobSpeed")} v={`+${Math.round(((1 + OC_STEPS[tune.cpu]) * (1 + OC_STEPS[tune.net]) - 1) * 100)}%`} />
          <KeyValue k={t("tune.tempBusy")} v={`${Math.round(busyTemp)} °C`} />
          <KeyValue k={t("tune.wear")} v={tune.cpu || tune.net ? t("tune.wearValue", { n: WEAR_PER_MIN }) : "—"} />
        </Card>
      </div>

      <ClockCard part="cpu" title={t("rig.slot.cpu")} from={`${fmt.number(stats.cpu, 1)} GHz`} to={`${fmt.number(stats.cpu * (1 + OC_STEPS[tune.cpu]), 1)} GHz`} effect={t("tune.crackTime")} />
      <ClockCard part="net" title={t("rig.slot.net")} from={netSpeed(stats.netMbps)} to={netSpeed(stats.netMbps * (1 + OC_STEPS[tune.net]))} effect={t("tune.pullTime")} />

      <div className="settings-card">
        <span className="tune-icon">
          <Icon name={PART_ICON.cool} size={20} />
        </span>
        <div className="settings-card-text">
          <span className="t-body-strong">{cooler ? t("tune.cooler", { name: cooler.name, tier: cooler.tier }) : t("rig.slot.cool")}</span>
          <span className="t-caption c-secondary">{cooler?.spec}</span>
        </div>
        <Button onClick={() => useWindows.getState().open("browser", { url: urls.category("cool") })}>{t("tune.shopCoolers")}</Button>
      </div>
    </>
  );
}

function ClockCard({ part, title, from, to, effect }: { part: "cpu" | "net"; title: string; from: string; to: string; effect: string }) {
  const t = useT();
  const step = useGame((s) => s.game.tuning[part]);
  const p = useGame((s) => s.game.rig[part]);
  const cond = Math.round(p?.condition ?? 0);
  return (
    <Card>
      <div className="tune-clock">
        <span className="tune-icon">
          <Icon name={PART_ICON[part]} size={20} />
        </span>
        <div className="tune-clock-title">
          <span className="t-body-strong">{title}</span>
          <span className="t-caption c-secondary">
            {from} → {to}
          </span>
        </div>
        <div className="segmented">
          {OC_STEPS.map((v, i) => (
            <button type="button" key={i} className={step === i ? "on" : ""} onClick={() => useGame.getState().setClock(part, i as OcStep)}>
              {i === 0 ? t("tune.stock") : `+${Math.round(v * 100)}%`}
            </button>
          ))}
        </div>
      </div>
      <KeyValue k={effect} v={step ? `−${Math.round((1 - 1 / (1 + OC_STEPS[step])) * 100)}%` : "—"} />
      <KeyValue k={t("tune.condition")} v={step ? t("tune.wearing", { n: cond }) : `${cond}%`} />
    </Card>
  );
}

/** Bars for the last 60 s; yellow above the ceiling, red line at the ceiling. */
export function TempGraph({ history, ceiling }: { history: number[]; ceiling: number }) {
  const max = ceiling + 25;
  const h = 72;
  const bars = history.slice(-40);
  return (
    <div className="tune-graph" style={{ height: h }}>
      {bars.map((v, i) => (
        <span key={i} style={{ height: `${Math.min(100, (v / max) * 100)}%`, background: v >= ceiling ? "var(--caution)" : "var(--accent)" }} />
      ))}
      <i style={{ bottom: `${(ceiling / max) * 100}%` }} />
    </div>
  );
}
