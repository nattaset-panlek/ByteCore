import { useEffect, useRef, useState } from "react";
import { CHAPTER_GATE, FACTIONS, REP_TIERS, repTier, RIVAL_OF, type ChoiceId, type FactionId, type RelayMsg } from "../../game/factions";
import { useGame } from "../../game/store";
import { t as tt, tm, useT } from "../../i18n";
import { useWindow } from "../../os/Window";
import { Badge, Button, InfoBar, KeyValue, Meter, TextBox } from "../../ui";
import { credits, EmptyState, NavApp, NavHeader, usePages } from "../common";
import { TitleBar } from "../../os/Window";

// Relay (docs/gameplay-ideas.md §4): faction chats with reply buttons, a reputation panel, and a
// Factions page with the tier ladder, perks and the five-chapter story.

const TONE = { hostile: "critical", neutral: "caution", trusted: "success", inner: "accent" } as const;
const COLOR = { hostile: "var(--critical)", neutral: "var(--caution)", trusted: "var(--success)", inner: "var(--accent)" } as const;
const INITIALS: Record<FactionId, string> = { chimera: "CH", halcyon: "HC", static: "ST" };

const ago = (at: number) => {
  const m = Math.max(0, Math.round((Date.now() - at) / 60000));
  return m < 60 ? `${m}m` : m < 1440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`;
};

const text = (m: RelayMsg) => {
  const vars = { ...m.vars, ...(m.vars?.credits ? { credits: credits(Number(m.vars.credits)) } : {}), ...(m.vars?.from ? { from: tt(`faction.${m.vars.from}`) } : {}), ...(m.vars?.rival ? { rival: tt(`faction.${m.vars.rival}`) } : {}) };
  return tt(m.key, vars);
};

export function Relay() {
  const { win } = useWindow();
  const [view, setView] = useState<"chats" | "factions">(win.args?.view === "factions" ? "factions" : "chats");
  const [faction, setFaction] = useState<FactionId>((win.args?.faction as FactionId) ?? "chimera");
  if (view === "factions") return <FactionsView faction={faction} setFaction={setFaction} back={() => setView("chats")} />;
  return <ChatsView faction={faction} setFaction={setFaction} openFactions={() => setView("factions")} />;
}

function ChatsView({ faction, setFaction, openFactions }: { faction: FactionId; setFaction: (f: FactionId) => void; openFactions: () => void }) {
  const t = useT();
  const f = useGame((s) => s.game.factions);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const thread = f.threads[faction];
  const rep = f.rep[faction];
  const tier = repTier(rep);
  const pending = [...thread].reverse().find((m) => m.choices?.length);

  useEffect(() => {
    useGame.getState().readRelay(faction);
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [faction, thread.length]);

  const list = FACTIONS.filter((id) => t(`faction.${id}`).toLowerCase().includes(q.toLowerCase())).sort((a, b) => (f.threads[b].at(-1)?.at ?? 0) - (f.threads[a].at(-1)?.at ?? 0));
  const reply = (m: RelayMsg, c: ChoiceId) => {
    const r = useGame.getState().replyRelay(faction, m.id, c);
    if (!r.ok) setError(tm(r.error));
  };
  const choiceLabel = (m: RelayMsg, c: ChoiceId) =>
    m.chapter ? t(`story.${faction}.${m.chapter}.${c}`) : c === "accept" ? t("relay.accept") : c === "counter" ? t("relay.counter") : t("relay.leak", { rival: t(`faction.${RIVAL_OF[faction]}`) });

  return (
    <>
      <TitleBar />
      <div className="relay">
        <aside className="relay-list">
          <TextBox value={q} onChange={setQ} placeholder={t("relay.search")} icon="icon/search" />
          {list.map((id) => {
            const last = f.threads[id].at(-1);
            return (
              <button type="button" key={id} className={`relay-chat ${id === faction ? "on" : ""}`} onClick={() => setFaction(id)}>
                <span className="person">{INITIALS[id]}</span>
                <span className="relay-chat-text">
                  <span className="t-body-strong">{t(`faction.${id}`)}</span>
                  <span className="t-caption c-secondary">{last ? text(last) : t("relay.empty")}</span>
                </span>
                <span className="relay-chat-meta t-caption c-tertiary">
                  {last ? ago(last.at) : ""}
                  {f.unread[id] > 0 && id !== faction && <span className="info-badge">{f.unread[id]}</span>}
                </span>
              </button>
            );
          })}
          <span className="spacer" />
          <Button onClick={openFactions}>{t("relay.nav.factions")}</Button>
        </aside>

        <section className="relay-convo">
          <header className="relay-head">
            <span className="person">{INITIALS[faction]}</span>
            <div>
              <div className="t-body-strong">{t(`faction.${faction}`)}</div>
              <div className="t-caption c-secondary">{t(`faction.${faction}.tag`)}</div>
            </div>
            <span className="spacer" />
            <Badge tone={TONE[tier]}>
              {t(`tier.${tier}`)} · {rep}
            </Badge>
          </header>
          <div className="relay-msgs" ref={scroller}>
            {thread.length === 0 && <EmptyState icon="icon/info" title={t("relay.empty")} text={t("relay.emptyText")} />}
            {thread.map((m) => (
              <div key={m.id} className={`relay-msg ${m.from}`}>
                <div className="relay-bubble">{text(m)}</div>
                {m.offer && (
                  <div className="relay-offer card">
                    <div className="card-title">
                      <span className="t-body-strong">{t("relay.offer", { goal: t(`offer.kind.${m.offer.goal}`) })}</span>
                      <Badge tone="accent">{t("ops.tier", { tier: m.offer.tier })}</Badge>
                    </div>
                    <KeyValue k={t("relay.goal")} v={t(`goal.${m.offer.goal}`, { need: m.offer.need, tier: m.offer.tier })} />
                    <KeyValue k={t("relay.pay")} v={credits(m.offer.credits)} />
                    <KeyValue k={t("relay.rep")} v={t("relay.repValue", { faction: t(`faction.${faction}`), n: m.offer.rep })} />
                  </div>
                )}
              </div>
            ))}
          </div>
          {error && <InfoBar severity="error" title={t("common.failed")} message={error} onClose={() => setError(null)} />}
          <footer className="relay-replies">
            {pending?.choices?.map((c, i) => (
              <Button key={c} variant={i === 0 ? "accent" : "standard"} onClick={() => reply(pending, c)}>
                {choiceLabel(pending, c)}
              </Button>
            ))}
          </footer>
        </section>

        <aside className="relay-rep">
          <span className="t-body-strong">{t("relay.reputation")}</span>
          {FACTIONS.map((id) => {
            const tr = repTier(f.rep[id]);
            return (
              <div key={id} className="relay-rep-row">
                <div className="kv">
                  <span className="t-caption">{t(`faction.${id}`)}</span>
                  <span className="t-body-strong" style={{ color: COLOR[tr] }}>
                    {f.rep[id]}
                  </span>
                </div>
                <div className="meter-track">
                  <div className="meter-fill" style={{ width: `${(f.rep[id] + 100) / 2}%`, background: COLOR[tr] }} />
                </div>
                <span className="t-caption" style={{ color: COLOR[tr] }}>
                  {t(`tier.${tr}`)}
                </span>
              </div>
            );
          })}
          {pending?.offer && (
            <div className="card relay-leak">
              <span className="t-body-strong">{t("relay.ifLeak")}</span>
              <KeyValue k={t(`faction.${faction}`)} v={String(pending.offer.leak.from)} />
              <KeyValue k={t(`faction.${RIVAL_OF[faction]}`)} v={`+${pending.offer.leak.to}`} />
              <span className="t-caption c-caution">{t(`relay.leakWarn.${faction}`)}</span>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

function FactionsView({ faction, setFaction, back }: { faction: FactionId; setFaction: (f: FactionId) => void; back: () => void }) {
  const t = useT();
  const f = useGame((s) => s.game.factions);
  const level = useGame((s) => s.game.player.level);
  const pages = usePages<FactionId>(faction);
  const rep = f.rep[pages.page];
  const tier = repTier(rep);
  const id = pages.page;
  return (
    <NavApp
      header={<NavHeader icon="app/Relay" title={t("app.relay")} caption={t("relay.nav.factions")} />}
      items={FACTIONS.map((x) => ({ id: x, label: t(`faction.${x}`), icon: "icon/globe" }))}
      pages={{ ...pages, go: (p) => (setFaction(p), pages.go(p)), back }}
      title={t(`faction.${id}`)}
    >
      <p className="t-body c-secondary">{t(`faction.${id}.about`)}</p>
      <span className="t-body-strong">{t("relay.tiers")}</span>
      <div className="relay-tiers">
        {REP_TIERS.map((r, i) => (
          <div key={r.id} className={`card relay-tier ${r.id === tier ? "on" : ""}`}>
            <div className="card-title">
              <span className="t-body-strong">{t(`tier.${r.id}`)}</span>
              {r.id === tier && <Badge tone="accent">{t("relay.you")}</Badge>}
            </div>
            <span className="t-caption c-tertiary">{t("tier.range", { min: r.min, max: (REP_TIERS[i + 1]?.min ?? 101) - 1 })}</span>
            <span className="t-caption">{t(`perk.${id}.${r.id}`)}</span>
          </div>
        ))}
      </div>
      <Meter label={t("relay.repOf", { faction: t(`faction.${id}`) })} value={(rep + 100) / 200} text={`${rep} / 100`} tone={tier === "hostile" ? "critical" : tier === "neutral" ? "caution" : "success"} />
      <span className="t-body-strong">{t("relay.story", { title: t(`faction.${id}.arc`) })}</span>
      <div className="relay-story">
        {[1, 2, 3, 4, 5].map((n) => {
          const done = f.chapter[id] >= n;
          const current = !done && f.chapter[id] === n - 1;
          const [gr, gl] = CHAPTER_GATE[n - 1];
          const open = rep >= gr && level >= gl;
          return (
            <div key={n} className={`relay-ch ${done ? "done" : current && open ? "current" : "locked"}`}>
              <span className="t-caption c-tertiary">{t("relay.ch", { n })}</span>
              <span className="relay-ch-title">{done || (current && open) ? t(`story.${id}.${n}`).split(/[.!?]/)[0] : t("relay.ch.gate", { rep: gr, level: gl })}</span>
              <Badge tone={done ? "success" : current && open ? "accent" : "neutral"}>{t(done ? "relay.ch.done" : current && open ? "relay.ch.current" : "relay.ch.locked")}</Badge>
            </div>
          );
        })}
      </div>
      {f.ending && <InfoBar severity="success" title={t("relay.ending", { ending: f.ending })} />}
    </NavApp>
  );
}
