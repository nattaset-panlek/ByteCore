import { xpToNext } from "../game/balance";
import { rigStats } from "../game/rig";
import { useGame } from "../game/store";
import { useT } from "../i18n";
import { useWindows } from "../os/windowStore";
import { Button, Icon, Meter, StatCard } from "../ui";
import { credits, date, fileSize, Section } from "./common";
import { netSpeed } from "./RigManager";

/** Tier title from player level, matching the unlock gates (GDD 4). */
export function titleKey(level: number): string {
  return level >= 10 ? "profile.title.sovereign" : level >= 6 ? "profile.title.ghost" : level >= 3 ? "profile.title.intruder" : "profile.title.kiddie";
}

/** Profile: level, XP, lifetime stats, rig summary, account (GDD 4). */
export function Profile() {
  const t = useT();
  const g = useGame((s) => s.game);
  const open = useWindows((s) => s.open);
  const stats = rigStats(g.rig);
  const next = xpToNext(g.player.level);
  const title = t(titleKey(g.player.level));

  return (
    <div className="profile">
      <div className="profile-hero">
        <span className="person large profile-avatar">{g.player.name.slice(0, 2).toUpperCase()}</span>
        <div className="profile-hero-text">
          <div className="t-title">{g.player.name}</div>
          <div className="t-body c-accent">
            {t("profile.level", { level: g.player.level })} · {title}
          </div>
          <div className="t-caption c-secondary">{t("profile.member", { date: date(g.createdAt) })}</div>
        </div>
      </div>

      <Meter label={t("profile.xp", { xp: Math.round(g.player.xp), next })} value={next ? g.player.xp / next : 0} text={t("profile.xpToGo", { n: Math.max(0, next - Math.round(g.player.xp)), level: g.player.level + 1 })} />

      <Section title={t("profile.section.activity")}>
        <div className="stat-row">
          <StatCard icon="icon/lock_closed" label={t("profile.stat.cracks")} value={String(g.player.stats.cracks)} />
          <StatCard icon="icon/arrow_download" label={t("profile.stat.pulls")} value={String(g.player.stats.pulls)} />
          <StatCard icon="icon/database" label={t("profile.stat.dataSold")} value={String(g.player.stats.dataSold)} />
          <StatCard icon="icon/document" label={t("profile.stat.contracts")} value={String(g.player.stats.contracts)} />
          <StatCard icon="icon/warning" label={t("profile.stat.arrests")} value={String(g.player.stats.arrests)} tone={g.player.stats.arrests ? "critical" : undefined} />
          <StatCard icon="icon/warning" label={t("profile.stat.peakHeat")} value={`${g.player.stats.peakHeat}%`} />
        </div>
      </Section>

      <Section title={t("profile.section.rig")} action={<Button variant="subtle" onClick={() => open("rigManager")}>{t("profile.openRig")}</Button>}>
        <div className="stat-row">
          <StatCard icon="icon/developer_board" label="CPU" value={`${stats.cpu.toFixed(1)} GHz`} />
          <StatCard icon="icon/table" label="RAM" value={`${stats.ramGB} GB`} />
          <StatCard icon="icon/globe" label="Network" value={netSpeed(stats.netMbps)} />
          <StatCard icon="icon/database" label="Storage" value={fileSize(stats.diskGB * 1024)} />
        </div>
      </Section>

      <Section title={t("profile.section.account")} action={<Button variant="subtle" onClick={() => open("settings")}>{t("profile.openSettings")}</Button>}>
        <div className="stat-row">
          <StatCard icon="icon/wallet" label={t("profile.stat.balance")} value={credits(g.wallet.balance)} />
          <StatCard icon="icon/wallet" label={t("profile.stat.debt")} value={credits(g.wallet.debt)} tone={g.wallet.debt > 0 ? "caution" : undefined} />
        </div>
      </Section>
      <span className="profile-logo">
        <Icon name="app/Profile" size={16} /> Xea OS
      </span>
    </div>
  );
}
