import { useState } from "react";
import { LEAGUES, raceProgress, RANK_REWARD, RANK_REWARD_REST, rivalById, RIVALS, standings, weekEndsAt, type Rival } from "../../game/rivals";
import { TRIALS } from "../../game/trials";
import { useGame } from "../../game/store";
import { fmt, useT } from "../../i18n";
import { useWindow } from "../../os/Window";
import { Badge, Card, InfoBar, KeyValue, Meter } from "../../ui";
import { credits, duration, EmptyState, NavApp, NavHeader, usePages, useNow } from "../common";
import { Glyph } from "./Glyph";

// Ghost Board (docs/gameplay-ideas.md §3): weekly ranking against NPC operators, rival profiles,
// races for marked files, trial medals and leagues.

type Page = "week" | "rivals" | "races" | "trials" | "leagues";
const NAV: { id: Page; icon: string }[] = [
  { id: "week", icon: "icon/table" },
  { id: "rivals", icon: "icon/square_multiple" },
  { id: "races", icon: "icon/power" },
  { id: "trials", icon: "icon/document" },
  { id: "leagues", icon: "icon/grid" },
];

const initials = (s: string) => s.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase();
const span = (ms: number) => {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
};

export function GhostBoard() {
  const t = useT();
  const { win } = useWindow();
  const pages = usePages<Page>((win.args?.page as Page) ?? "week");
  const [find, setFind] = useState("");
  const [rival, setRival] = useState<string>("kestrel");
  const league = useGame((s) => s.game.rivals.league);
  const nav = NAV.map((n) => ({ ...n, label: t(`ghost.nav.${n.id}`) }));
  const q = find.trim().toLowerCase();
  const hit = q ? RIVALS.find((r) => r.handle.toLowerCase().includes(q)) : undefined;

  return (
    <NavApp
      header={<NavHeader icon="app/GhostBoard" title={t("app.ghostBoard")} caption={t(`ghost.league.${LEAGUES[league]}`)} />}
      search={{
        value: find,
        onChange: (v) => {
          setFind(v);
          const r = RIVALS.find((x) => x.handle.toLowerCase().includes(v.trim().toLowerCase()));
          if (v.trim() && r) {
            setRival(r.id);
            pages.go("rivals");
          }
        },
        placeholder: t("ghost.find"),
      }}
      items={nav}
      pages={pages}
      title={pages.page === "rivals" ? (hit ?? rivalById(rival))?.handle : t(`ghost.nav.${pages.page}`)}
    >
      {pages.page === "week" && <Week openRival={(id) => (setRival(id), pages.go("rivals"))} />}
      {pages.page === "rivals" && <Rivals sel={rival} setSel={setRival} />}
      {pages.page === "races" && <Races />}
      {pages.page === "trials" && <TrialMedals />}
      {pages.page === "leagues" && <Leagues />}
    </NavApp>
  );
}

function Week({ openRival }: { openRival: (id: string) => void }) {
  const t = useT();
  const r = useGame((s) => s.game.rivals);
  const name = useGame((s) => s.game.player.name);
  const now = useNow(2000);
  const table = standings(r, name, now);
  const me = table.find((s) => s.id === "you")!;
  const race = r.race;
  return (
    <>
      <Card>
        <div className="ghost-banner">
          <span className="ghost-shield">
            <Glyph name="league" size={20} />
          </span>
          <div>
            <div className="t-body-strong">{t("ghost.banner", { league: t(`ghost.league.${LEAGUES[r.league]}`), week: r.week % 52 })}</div>
            <div className="t-caption c-secondary">{t("ghost.bannerText", { time: span(weekEndsAt(r) - now) })}</div>
          </div>
          <span className="spacer" />
          <span className="t-caption c-accent">● {t("ghost.you", { rank: me.rank })}</span>
        </div>
      </Card>
      <Card>
        <div className="ghost-table">
          <div className="ghost-row head t-caption c-secondary">
            <span>{t("ghost.rank")}</span>
            <span>{t("ghost.operator")}</span>
            <span>{t("ghost.style")}</span>
            <span>{t("ghost.score")}</span>
            <span>{t("ghost.week")}</span>
          </div>
          {table.map((s) => (
            <button type="button" key={s.id} className={`ghost-row ${s.id === "you" ? "me" : ""}`} onClick={() => s.id !== "you" && openRival(s.id)}>
              <span className="c-secondary">#{s.rank}</span>
              <span className="ghost-op">
                <span className="person small">{initials(s.handle)}</span>
                <span className="t-body-strong">{s.handle}</span>
              </span>
              <span className="c-secondary">{t(`ghost.style.${s.style}`)}</span>
              <span>{fmt.number(s.score)}</span>
              <span className={s.delta ? (s.delta > 0 ? "c-success" : "c-critical") : "c-tertiary"}>{s.delta ? `${s.delta > 0 ? "▲" : "▼"} ${Math.abs(s.delta)}` : "–"}</span>
            </button>
          ))}
        </div>
      </Card>
      {race && <InfoBar severity="info" title={t("ghost.raceOpen")} message={t("ghost.raceOpenText", { rival: rivalById(race.rival)?.handle ?? race.rival, ip: race.ip, bounty: credits(race.bounty) })} />}
    </>
  );
}

function Rivals({ sel, setSel }: { sel: string; setSel: (id: string) => void }) {
  const t = useT();
  const r = useGame((s) => s.game.rivals);
  const name = useGame((s) => s.game.player.name);
  const now = useNow(2000);
  const rival = rivalById(sel) ?? RIVALS[0];
  const table = standings(r, name, now);
  const rank = table.find((s) => s.id === rival.id)?.rank;
  const rec = r.h2h[rival.id] ?? [0, 0];
  const feed = r.feed.filter((f) => f.rival === rival.id);
  return (
    <>
      <div className="segmented ghost-pick">
        {RIVALS.map((x) => (
          <button type="button" key={x.id} className={x.id === rival.id ? "on" : ""} onClick={() => setSel(x.id)}>
            {x.handle}
          </button>
        ))}
      </div>
      <RivalCard rival={rival} rank={rank} rec={rec} name={name} league={r.league} />
      <Card>
        <span className="t-body-strong">{t("ghost.recentFeed")}</span>
        {feed.length === 0 && <span className="t-caption c-tertiary">{t("ghost.noFeed")}</span>}
        {feed.slice(0, 8).map((f, i) => (
          <KeyValue key={i} k={t(f.key, f.vars)} v={<span className="c-tertiary">{duration(now - f.at)}</span>} />
        ))}
      </Card>
    </>
  );
}

function RivalCard({ rival, rank, rec, name, league }: { rival: Rival; rank?: number; rec: [number, number]; name: string; league: number }) {
  const t = useT();
  return (
    <Card>
      <div className="ghost-profile">
        <span className="person large">{initials(rival.handle)}</span>
        <div>
          <div className="t-subtitle">{rival.handle}</div>
          <div className="t-caption c-secondary">
            {t(`ghost.style.${rival.style}`)} · {t(`ghost.styleText.${rival.style}`)}
          </div>
        </div>
        <span className="spacer" />
        <Badge tone="critical">{t("ghost.rival")}</Badge>
      </div>
      <KeyValue k={t("ghost.league")} v={`${t(`ghost.league.${LEAGUES[league]}`)} · #${rank ?? "–"}`} />
      <KeyValue k={t("ghost.h2h")} v={t("ghost.h2hValue", { a: rec[0], b: rec[1], name: rival.handle })} />
      <KeyValue k={t("ghost.favTier")} v={t("ops.tier", { tier: rival.favTier })} />
      <div className="ghost-quote">
        {t(`ghost.quote.${rival.id}`)} — {rival.handle}
      </div>
      <span className="t-caption c-tertiary">{name}</span>
    </Card>
  );
}

function Races() {
  const t = useT();
  const race = useGame((s) => s.game.rivals.race);
  const host = useGame((s) => (race ? s.game.net.hosts.find((h) => h.ip === race.ip) : undefined));
  const session = useGame((s) => s.game.net.session);
  const pulling = useGame((s) => (race ? s.game.jobs.find((j) => j.kind === "pull" && j.remotePath === race.path && j.target === race.ip) : undefined));
  const now = useNow(500);
  if (!race) return <EmptyState icon="icon/power" title={t("ghost.noRace")} text={t("ghost.noRaceText")} />;
  const rival = rivalById(race.rival)!;
  const rp = raceProgress(race, now);
  const myStep = !host?.portsKnown ? "find" : !host.cracked ? "crack" : session?.ip !== race.ip ? "connect" : "pull";
  const myP = pulling ? 0.75 + 0.25 * Math.min(1, (now - pulling.startedAt) / Math.max(1, pulling.endsAt - pulling.startedAt)) : { find: 0.05, crack: 0.3, connect: 0.55, pull: 0.7 }[myStep];
  return (
    <Card>
      <div className="card-title">
        <span className="t-body-strong">{t("ghost.race", { ip: race.ip })}</span>
        <Badge tone="critical">● {t("ghost.live")}</Badge>
      </div>
      <div className="ghost-race-row">
        <span>{t("ghost.raceYou")}</span>
        <Meter value={myP} tone="accent" />
        <span className="t-caption">{t(`ghost.yourStep.${myStep}`)}</span>
      </div>
      <div className="ghost-race-row">
        <span>{rival.handle}</span>
        <Meter value={rp.p} tone="caution" />
        <span className="t-caption">{t(`ghost.phase.${rp.phase}`, { n: Math.round(((rp.p - 0.6) / 0.4) * 100) })}</span>
      </div>
      <KeyValue k={t("ghost.markedFile")} v={`${race.path.split("/").pop()} · ${race.size} MB`} />
      <KeyValue k={t("ghost.bounty")} v={credits(race.bounty)} />
      <span className="t-caption c-secondary">{t("ghost.raceHelp", { path: race.path, rival: rival.handle })}</span>
    </Card>
  );
}

function TrialMedals() {
  const t = useT();
  const trials = useGame((s) => s.game.trials);
  return (
    <Card>
      <span className="t-body-strong">{t("ghost.trials")}</span>
      {TRIALS.map((x, i) => {
        const rec = trials[x.id];
        return (
          <KeyValue
            key={x.id}
            k={`${String(i + 1).padStart(2, "0")} ${t(`trial.${x.id}`)}`}
            v={rec ? <Badge tone={rec.medal === "gold" ? "success" : rec.medal === "silver" ? "neutral" : "caution"}>{`${t(`trial.medal.${rec.medal}`)} · ${duration(rec.best * 1000).slice(3)}`}</Badge> : <span className="c-tertiary">—</span>}
          />
        );
      })}
    </Card>
  );
}

function Leagues() {
  const t = useT();
  const r = useGame((s) => s.game.rivals);
  const mult = 1 + r.league * 0.5;
  return (
    <>
      <Card>
        <span className="t-body-strong">{t("ghost.leagues.title")}</span>
        <span className="t-body c-secondary">{t("ghost.leagues.text")}</span>
        <div className="ghost-leagues">
          {LEAGUES.map((l, i) => (
            <div key={l} className={`ghost-league ${i === r.league ? "on" : ""}`}>
              <Glyph name="league" size={20} />
              <span className="t-body-strong">{t(`ghost.league.${l}`)}</span>
              {i === r.league && <Badge tone="accent">{t("relay.you")}</Badge>}
            </div>
          ))}
        </div>
        <KeyValue k={t("ghost.reward")} v={t("ghost.rewardValue", { a: credits(RANK_REWARD[0] * mult), b: credits(RANK_REWARD[1] * mult), c: credits(RANK_REWARD[2] * mult), d: credits(RANK_REWARD_REST * mult) })} />
      </Card>
      <Card>
        <span className="t-body-strong">{t("ghost.badges")}</span>
        {r.badges.length === 0 ? (
          <span className="t-caption c-tertiary">{t("ghost.noBadges")}</span>
        ) : (
          <div className="ops-tags">
            {r.badges.map((b) => {
              const [, w, rank] = /w(\d+)-(\d)/.exec(b) ?? [];
              return (
                <Badge key={b} tone="accent">
                  {t("ghost.badge", { week: Number(w) % 52, rank })}
                </Badge>
              );
            })}
          </div>
        )}
      </Card>
    </>
  );
}
