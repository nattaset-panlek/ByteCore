import { jobProgress } from "../game/jobs";
import { TRACE_PER_SEC } from "../game/network";
import { useGame } from "../game/store";
import { useT } from "../i18n";
import { useWindows } from "../os/windowStore";
import { Button, Card, Icon, KeyValue, Meter } from "../ui";
import { duration, EmptyState, fileSize, useNow } from "./common";
import * as vfs from "../game/vfs";

/** Chimera Kit (GDD 3.1.2): the active remote session — target, trace countdown, transfers, Disconnect. */
export function ChimeraKit() {
  const t = useT();
  const session = useGame((s) => s.game.net.session);
  const host = useGame((s) => (session ? s.game.net.hosts.find((h) => h.ip === session.ip) : undefined));
  const jobs = useGame((s) => s.game.jobs);
  const now = useNow();

  if (!session || !host) {
    return (
      <div className="chimera">
        <Card>
          <EmptyState icon="icon/lock_closed" title={t("chimera.noSession.title")} text={t("chimera.noSession.text")} />
          <Button variant="accent" onClick={() => useWindows.getState().open("terminal")} style={{ alignSelf: "center" }}>
            {t("chimera.openTerminal")}
          </Button>
        </Card>
        <CrackTargets />
      </div>
    );
  }

  const rate = TRACE_PER_SEC[host.admin];
  const secondsLeft = Math.max(0, Math.ceil((100 - session.trace) / rate));
  const tone = session.trace > 75 ? "critical" : session.trace > 50 ? "caution" : "success";
  const transfers = jobs.filter((j) => j.kind === "pull" && j.target === session.ip);
  const lootFiles = vfs
    .list(host.fs, "/var/data")
    .filter((n) => n.type === "file");

  const pull = (name: string) => useGame.getState().pull(`/var/data/${name}`);

  return (
    <div className="chimera">
      <Card>
        <div className="part-head">
          <span className="part-icon">
            <Icon name="icon/globe" size={20} />
          </span>
          <div className="part-title">
            <span className="t-body-strong">{host.org}</span>
            <span className="t-caption c-secondary">
              {host.ip} · {host.name}
            </span>
          </div>
          <Button icon="icon/dismiss" onClick={() => useGame.getState().disconnect()}>
            {t("chimera.disconnect")}
          </Button>
        </div>
        <div className="part-kvs">
          <KeyValue k={t("chimera.target")} v={t("chimera.tier", { tier: host.tier })} />
          <KeyValue k={t("chimera.admin", { admin: host.admin })} v={t("chimera.security", { security: host.security })} />
          <KeyValue k={t("chimera.connectedFor", { time: duration(now - session.connectedAt) })} v="" />
        </div>
      </Card>

      <Card>
        <Meter label={t("chimera.trace")} value={session.trace / 100} text={t("chimera.secondsLeft", { seconds: secondsLeft })} tone={tone} />
        {session.trace > 60 && <div className="t-caption c-caution">{t("chimera.traceWarn", { ip: host.ip })}</div>}
      </Card>

      <section className="app-section">
        <div className="app-section-head">
          <span className="t-body-strong">{t("chimera.transfers")}</span>
        </div>
        {transfers.length === 0 ? (
          <Card>
            <span className="t-caption c-secondary">{t("chimera.noTransfers")}</span>
          </Card>
        ) : (
          transfers.map((j) => (
            <Card key={j.id}>
              <Meter
                label={t("chimera.pulling", { name: (j.remotePath ?? "").split("/").pop() ?? "" })}
                value={jobProgress(j, now)}
                text={duration(j.endsAt - now)}
              />
            </Card>
          ))
        )}
      </section>

      <section className="app-section">
        <div className="app-section-head">
          <span className="t-body-strong">{t("chimera.files")}</span>
        </div>
        <div className="card-grid">
          {lootFiles.map((f) => (
            <Card key={f.name}>
              <div className="part-title">
                <span className="t-body-strong">{f.name}</span>
                <span className="t-caption c-secondary">{fileSize(vfs.sizeOf(f))}</span>
              </div>
              <Button onClick={() => pull(f.name)} disabled={transfers.some((j) => (j.remotePath ?? "").endsWith(f.name))}>
                {t("chimera.pull")}
              </Button>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

/** Probed hosts still to crack, each with the hands-on Lockgrid (docs/gameplay-ideas.md §1). */
function CrackTargets() {
  const t = useT();
  const hosts = useGame((s) => s.game.net.hosts.filter((h) => h.portsKnown && !h.cracked));
  const jobs = useGame((s) => s.game.jobs);
  if (!hosts.length) return null;
  return (
    <section className="app-section">
      <div className="app-section-head">
        <span className="t-body-strong">{t("chimera.toCrack")}</span>
      </div>
      <div className="card-grid">
        {hosts.map((h) => {
          const busy = jobs.some((j) => j.kind === "crack" && j.target === h.ip);
          return (
            <Card key={h.ip}>
              <div className="part-title">
                <span className="t-body-strong">{h.org}</span>
                <span className="t-caption c-secondary">
                  {h.ip} · {t("chimera.tier", { tier: h.tier })} · {t("chimera.security", { security: h.security })}
                </span>
              </div>
              <div className="row-gap">
                <Button variant="accent" disabled={busy} onClick={() => useWindows.getState().open("lockgrid", { ip: h.ip })}>
                  {t("grid.open")}
                </Button>
                <Button disabled={busy} onClick={() => useGame.getState().crack(h.ip)}>
                  {t("chimera.autoCrack")}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
