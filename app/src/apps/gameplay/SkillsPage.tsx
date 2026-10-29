import { useState } from "react";
import { BRANCHES, BRANCH_GLYPH, branchSpent, effectVars, gateOpen, nodeState, rank, respecCost, SKILL, SKILLS, TIER_GATE, totalSpent, type SkillId } from "../../game/skills";
import { useGame } from "../../game/store";
import { tm, useT } from "../../i18n";
import { Badge, Button, ContentDialog, Icon, InfoBar, KeyValue } from "../../ui";
import { credits, duration, useNow } from "../common";
import { Glyph } from "./Glyph";

// Profile → Skills (docs/gameplay-ideas.md §7): four branch columns × four tiers, gate lines between
// tiers, a details pane with the current → next effect and Learn.

export function SkillsPage() {
  const t = useT();
  const level = useGame((s) => s.game.player.level);
  const sk = useGame((s) => s.game.player.skills);
  const [sel, setSel] = useState<SkillId>(() => SKILLS.find((d) => nodeState(sk, level, d.id) === "available")?.id ?? "soft_steps");
  const [respec, setRespec] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const now = useNow();
  const spent = totalSpent(sk);
  const cost = respecCost(sk, now);

  const tierOf = (tier: number) => SKILLS.filter((d) => d.tier === tier);
  const label = (id: SkillId) => {
    const d = SKILL[id];
    const r = rank(sk, id);
    if (d.active) return t("skills.activeRank", { rank: r, max: d.max });
    if (d.max === 1) return t("skills.capstone", { rank: r, max: d.max });
    return t("skills.rankOf", { rank: r, max: d.max });
  };

  return (
    <div className="skills">
      <div className="skills-tree">
        <div className="skills-head">
          <div>
            <div className="t-title">{t("skills.title")}</div>
            <div className="t-caption c-secondary">{t("skills.summary", { level, earned: spent + sk.points, spent })}</div>
          </div>
          <span className="spacer" />
          {sk.points > 0 ? <Badge tone="accent">{t("skills.toSpend", { count: sk.points })}</Badge> : <Badge>{t("skills.noPoints")}</Badge>}
          <Button disabled={!spent} onClick={() => setRespec(true)}>
            {t("skills.respec")}
          </Button>
        </div>
        {error && <InfoBar severity="error" title={t("common.failed")} message={error} onClose={() => setError(null)} />}

        <div className="skills-canvas">
          <div className="skills-branches">
            {BRANCHES.map((b) => (
              <div key={b} className="skills-branch">
                <span className="skills-branch-icon">
                  <Glyph name={BRANCH_GLYPH[b]} size={16} />
                </span>
                <div>
                  <div className="t-body-strong">{t(`branch.${b}`)}</div>
                  <div className="t-caption c-tertiary">{t("skills.ranks", { n: branchSpent(sk, b) })}</div>
                </div>
              </div>
            ))}
          </div>
          {[1, 2, 3, 4].map((tier) => (
            <div key={tier} className="skills-tier">
              {tier > 1 && (
                <div className="skills-gate">
                  <span className="t-caption c-tertiary">{t("skills.gate", { level: TIER_GATE[tier][0], points: TIER_GATE[tier][1] })}</span>
                </div>
              )}
              <div className="skills-row">
                {BRANCHES.map((b) => {
                  const d = tierOf(tier).find((x) => x.branch === b)!;
                  const st = nodeState(sk, level, d.id);
                  const learned = st === "learned" || st === "maxed";
                  const prev = SKILLS.find((x) => x.branch === b && x.tier === tier - 1);
                  const linkOn = prev && rank(sk, prev.id) > 0 && st !== "locked";
                  return (
                    <div key={b} className="skills-cell">
                      {tier > 1 && <span className={`skills-link ${linkOn ? "on" : ""}`} />}
                      <button
                        type="button"
                        className={`skill-tile ${learned ? "learned" : st} ${d.active ? "round" : ""} ${sel === d.id ? "selected" : ""}`}
                        onClick={() => setSel(d.id)}
                        aria-label={t(`skill.${d.id}`)}
                      >
                        <Glyph name={d.glyph} size={22} />
                        {st === "locked" && (
                          <span className="skill-lock">
                            <Icon name="icon/lock_closed" size={12} />
                          </span>
                        )}
                      </button>
                      <span className={`t-caption ${st === "locked" ? "c-tertiary" : ""}`}>{t(`skill.${d.id}`)}</span>
                      <span className={`t-caption ${learned ? "c-accent" : "c-tertiary"}`}>{label(d.id)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="skills-legend t-caption">
          <span className="c-accent">{t("skills.legend.learned")}</span>
          <span>{t("skills.legend.available")}</span>
          <span className="c-tertiary">{t("skills.legend.locked")}</span>
          <span className="c-tertiary">{t("skills.legend.round")}</span>
          <span className="c-tertiary">{t("skills.legend.gate")}</span>
        </div>
      </div>

      <Details id={sel} onError={setError} now={now} />

      <div className="skills-status t-caption">
        <span className={sk.points ? "c-accent" : "c-secondary"}>{t("skills.toSpend", { count: sk.points })}</span>
        <span>{t("skills.respecCost", { cost: credits(cost) })}</span>
        <span className="spacer" />
        <span className="c-tertiary">
          {t("skills.build", { code: branchSpent(sk, "code"), stealth: branchSpent(sk, "stealth"), breach: branchSpent(sk, "breach"), rig: branchSpent(sk, "rig") })}
        </span>
      </div>

      <ContentDialog
        open={respec}
        title={t("skills.respecTitle")}
        primary={t("skills.respec").replace("…", "")}
        secondary={t("ui.cancel")}
        onPrimary={() => {
          const r = useGame.getState().respecSkills();
          if (!r.ok) setError(tm(r.error));
          setRespec(false);
        }}
        onClose={() => setRespec(false)}
      >
        <p>{t("skills.respecBody", { spent })}</p>
        <p className="c-secondary">{t("skills.respecBody2", { cost: credits(cost), next: credits(cost * 2) })}</p>
      </ContentDialog>
    </div>
  );
}

function Details({ id, onError, now }: { id: SkillId; onError: (e: string) => void; now: number }) {
  const t = useT();
  const level = useGame((s) => s.game.player.level);
  const sk = useGame((s) => s.game.player.skills);
  const d = SKILL[id];
  const r = rank(sk, id);
  const st = nodeState(sk, level, id);
  const open = gateOpen(sk, level, id);
  const fx = (n: number) => {
    const v = effectVars(id, n);
    return v ? t(`skill.${id}.fx`, v) : t("skills.none");
  };
  const nextSkill = SKILLS.find((x) => x.branch === d.branch && x.tier === d.tier + 1);
  const ready = sk.cooldowns[id] ?? 0;
  const learn = () => {
    const res = useGame.getState().learnSkill(id);
    if (!res.ok) onError(tm(res.error));
  };

  return (
    <aside className="skills-pane">
      <div className="skills-pane-head">
        <span className={`skill-tile big ${r > 0 ? "learned" : st} ${d.active ? "round" : ""}`}>
          <Glyph name={d.glyph} size={24} />
        </span>
        <div>
          <div className="t-subtitle">{t(`skill.${id}`)}</div>
          <div className="t-caption c-secondary">{t("skills.tierLine", { branch: t(`branch.${d.branch}`), tier: d.tier, kind: d.active ? t("skills.active") : t("skills.passive") })}</div>
        </div>
      </div>
      <div className="skills-pips">
        {Array.from({ length: d.max }, (_, i) => (
          <span key={i} className={i < r ? "on" : ""} />
        ))}
      </div>
      <p className="t-body c-secondary">{t(`skill.${id}.desc`)}</p>
      <div className="card">
        <KeyValue k={t("skills.rank")} v={t("skills.rankValue", { rank: r, max: d.max })} />
        <KeyValue k={t("skills.now")} v={fx(r)} />
        <KeyValue k={t("skills.next")} v={r >= d.max ? t("skills.maxed") : fx(r + 1)} />
        <KeyValue k={t("skills.cost")} v={t("skills.onePoint")} />
      </div>
      {d.active && r > 0 && (
        <InfoBar severity={now < ready ? "warning" : "success"} title={d.active.alias} message={now < ready ? t("skills.cooling", { time: duration(ready - now) }) : t("skills.use", { alias: d.active.alias, min: d.active.cooldownMs / 60000 })} />
      )}
      {nextSkill && r === 0 && <InfoBar severity="info" title={t("skills.opens")} message={t("skills.opensNext", { name: t(`skill.${nextSkill.id}`), tier: nextSkill.tier })} />}
      {!open && <InfoBar severity="warning" title={t("skills.legend.locked")} message={t("skills.needGate", { level: TIER_GATE[d.tier][0], points: TIER_GATE[d.tier][1], branch: t(`branch.${d.branch}`) })} />}
      <span className="spacer" />
      <Button variant="accent" disabled={r >= d.max || !open || sk.points <= 0} onClick={learn}>
        {r >= d.max ? t("skills.learned") : t("skills.learn", { rank: r + 1 })}
      </Button>
    </aside>
  );
}
