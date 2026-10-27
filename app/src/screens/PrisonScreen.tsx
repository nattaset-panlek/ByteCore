import { useEffect, useRef, useState } from "react";
import { JAILBREAK_TIME_MS } from "../game/balance";
import { useGame } from "../game/store";
import { useT } from "../i18n";
import { Button } from "../ui";
import { duration, useNow } from "../apps/common";

type Modal = "none" | "paperwork" | "jailbreak";

/** Full-screen prison workstation (GDD 3.6.3): paperwork, wait, new identity, one-shot jailbreak. */
export function PrisonScreen({ until, jailbreakUsed, jailbreakLocked }: { until: number; jailbreakUsed: boolean; jailbreakLocked: boolean }) {
  const t = useT();
  const now = useNow();
  const [modal, setModal] = useState<Modal>("none");
  const newIdentity = useGame((s) => s.newIdentity);
  const remaining = Math.max(0, until - now);

  return (
    <div className="legal-screen prison">
      <div className="prison-head">
        <div className="legal-title">{t("prison.title")}</div>
        <div className="legal-subtitle">{t("prison.subtitle")}</div>
        <div className="prison-timer">
          <span className="t-caption c-secondary">{t("prison.sentence")}</span>
          <span className="t-title-large">{duration(remaining)}</span>
        </div>
      </div>

      <div className="prison-grid">
        <Option
          title={t("prison.option.paperwork")}
          desc={t("prison.option.paperworkDesc")}
          action={<Button variant="accent" onClick={() => setModal("paperwork")}>{t("prison.start")}</Button>}
        />
        <Option title={t("prison.option.wait")} desc={t("prison.option.waitDesc")} action={<span className="t-caption c-tertiary">{duration(remaining)}</span>} />
        <Option
          title={t("prison.option.jailbreak")}
          desc={t("prison.option.jailbreakDesc")}
          action={
            <Button
              disabled={jailbreakUsed || jailbreakLocked}
              onClick={() => setModal("jailbreak")}
            >
              {jailbreakLocked ? t("prison.jailbreakLocked") : jailbreakUsed ? t("prison.jailbreakUsed") : t("prison.start")}
            </Button>
          }
        />
        <Option
          title={t("prison.option.identity")}
          desc={t("prison.option.identityDesc")}
          action={
            <Button variant="subtle" onClick={() => confirm(t("prison.identityConfirm")) && newIdentity()}>
              {t("prison.start")}
            </Button>
          }
        />
      </div>

      {modal === "paperwork" && <Paperwork onClose={() => setModal("none")} />}
      {modal === "jailbreak" && <Jailbreak onClose={() => setModal("none")} />}
    </div>
  );
}

function Option({ title, desc, action }: { title: string; desc: string; action: React.ReactNode }) {
  return (
    <div className="prison-option">
      <div className="t-body-strong">{title}</div>
      <div className="t-caption c-secondary">{desc}</div>
      <div className="prison-option-action">{action}</div>
    </div>
  );
}

/* ---------- Paperwork mini-game ---------- */

const RECORDS = ["Payroll export", "Visitor log", "Case file 7781", "Cafeteria menu", "Transfer order", "Press release", "Cell block roster", "Maintenance ticket"];
const TOTAL_SHEETS = 6;

function Paperwork({ onClose }: { onClose: () => void }) {
  const t = useT();
  const paperwork = useGame((s) => s.paperwork);
  const [sheets] = useState(() =>
    Array.from({ length: TOTAL_SHEETS }, () => ({ label: RECORDS[Math.floor(Math.random() * RECORDS.length)], classified: Math.random() < 0.5 }))
  );
  const [i, setI] = useState(0);
  const [feedback, setFeedback] = useState<null | boolean>(null);

  const answer = (redact: boolean) => {
    if (feedback !== null) return;
    const correct = sheets[i].classified === redact;
    paperwork(correct);
    setFeedback(correct);
    window.setTimeout(() => {
      setFeedback(null);
      setI((n) => n + 1);
    }, 650);
  };

  const done = i >= TOTAL_SHEETS;
  const sheet = sheets[i];

  return (
    <div className="legal-modal-smoke">
      <div className="legal-modal">
        <div className="t-subtitle">{t("paperwork.title")}</div>
        {done ? (
          <>
            <div className="t-body c-secondary">{t("paperwork.done")}</div>
            <Button variant="accent" onClick={onClose}>{t("paperwork.close")}</Button>
          </>
        ) : (
          <>
            <div className="t-caption c-secondary">{t("paperwork.rule")}</div>
            <div className="t-caption c-tertiary">{t("paperwork.sheet", { n: i + 1, total: TOTAL_SHEETS })}</div>
            <div className={`paperwork-sheet ${feedback === null ? "" : feedback ? "ok" : "bad"}`}>
              <div className="t-body-large">{sheet.label}</div>
              <div className={`paperwork-stamp ${sheet.classified ? "classified" : "public"}`}>
                {sheet.classified ? t("paperwork.classified") : t("paperwork.public")}
              </div>
              {feedback !== null && <div className={`t-caption ${feedback ? "c-success" : "c-critical"}`}>{feedback ? t("paperwork.correct") : t("paperwork.wrong")}</div>}
            </div>
            <div className="legal-actions row">
              <Button onClick={() => answer(true)} disabled={feedback !== null}>{t("paperwork.redact")}</Button>
              <Button onClick={() => answer(false)} disabled={feedback !== null}>{t("paperwork.approve")}</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- Jailbreak mini-game ---------- */

const ARROWS = ["↑", "↓", "←", "→"] as const;
const SEQ_LEN = 5;

function Jailbreak({ onClose }: { onClose: () => void }) {
  const t = useT();
  const attempt = useGame((s) => s.attemptJailbreak);
  const [seq] = useState(() => Array.from({ length: SEQ_LEN }, () => ARROWS[Math.floor(Math.random() * ARROWS.length)]));
  const [phase, setPhase] = useState<"intro" | "memorize" | "enter" | "result">("intro");
  const [input, setInput] = useState<string[]>([]);
  const [result, setResult] = useState<boolean | null>(null);
  const [deadline, setDeadline] = useState(0);
  const now = useNow(100);
  const resolved = useRef(false);

  const finish = (success: boolean) => {
    if (resolved.current) return;
    resolved.current = true;
    attempt(success);
    setResult(success);
    setPhase("result");
  };

  // memorize phase lasts 2.5s, then switch to enter
  useEffect(() => {
    if (phase !== "memorize") return;
    const id = window.setTimeout(() => {
      setDeadline(Date.now() + JAILBREAK_TIME_MS);
      setPhase("enter");
    }, 2500);
    return () => window.clearTimeout(id);
  }, [phase]);

  // timeout during enter
  useEffect(() => {
    if (phase === "enter" && deadline && now >= deadline) finish(false);
  }, [phase, now, deadline]);

  const press = (a: string) => {
    if (phase !== "enter") return;
    const next = [...input, a];
    if (seq[next.length - 1] !== a) {
      finish(false);
      return;
    }
    setInput(next);
    if (next.length === seq.length) finish(true);
  };

  const secondsLeft = phase === "enter" ? Math.max(0, Math.ceil((deadline - now) / 1000)) : Math.ceil(JAILBREAK_TIME_MS / 1000);

  return (
    <div className="legal-modal-smoke">
      <div className="legal-modal jailbreak">
        <div className="t-subtitle">{t("jailbreak.title")}</div>
        {phase === "intro" && (
          <>
            <div className="t-body c-secondary">{t("jailbreak.memorize")}</div>
            <Button variant="accent" onClick={() => setPhase("memorize")}>{t("jailbreak.begin")}</Button>
          </>
        )}
        {phase === "memorize" && (
          <>
            <div className="t-caption c-secondary">{t("jailbreak.memorize")}</div>
            <div className="jailbreak-seq">{seq.map((a, i) => <span key={i} className="jailbreak-sym">{a}</span>)}</div>
          </>
        )}
        {phase === "enter" && (
          <>
            <div className="t-caption c-caution">{t("jailbreak.timeLeft", { seconds: secondsLeft })}</div>
            <div className="jailbreak-seq">{seq.map((_, i) => <span key={i} className={`jailbreak-sym ${i < input.length ? "filled" : ""}`}>{i < input.length ? input[i] : "?"}</span>)}</div>
            <div className="jailbreak-pad">
              {ARROWS.map((a) => (
                <button key={a} type="button" className="jailbreak-key" onClick={() => press(a)}>{a}</button>
              ))}
            </div>
          </>
        )}
        {phase === "result" && (
          <>
            <div className={`t-body-large ${result ? "c-success" : "c-critical"}`}>{result ? t("jailbreak.success") : t("jailbreak.fail")}</div>
            {!result && <Button variant="accent" onClick={onClose}>{t("paperwork.close")}</Button>}
          </>
        )}
      </div>
    </div>
  );
}
