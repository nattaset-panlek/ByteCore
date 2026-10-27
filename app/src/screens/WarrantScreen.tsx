import { useState } from "react";
import { DEBT_LIMIT } from "../game/balance";
import { useGame } from "../game/store";
import { fmt, tm, useT } from "../i18n";
import { Button } from "../ui";

/** Full-screen warrant (GDD 3.6.2): pay bail in cash or as a loan, or surrender to prison. */
export function WarrantScreen({ bail }: { bail: number }) {
  const t = useT();
  const balance = useGame((s) => s.game.wallet.balance);
  const debt = useGame((s) => s.game.wallet.debt);
  const soldCount = useGame((s) => s.game.soldHashes.length);
  const { payBail, surrender } = useGame.getState();
  const [error, setError] = useState("");

  const canCash = balance >= bail;
  const canLoan = debt + bail <= DEBT_LIMIT;

  const pay = (useDebt: boolean) => {
    const r = payBail(useDebt);
    if (!r.ok) setError(tm(r.error));
    else setError("");
  };

  return (
    <div className="legal-screen warrant">
      <div className="legal-card">
        <div className="legal-badge">⚠</div>
        <div className="legal-title">{t("warrant.title")}</div>
        <div className="legal-subtitle">{t("warrant.subtitle")}</div>

        <div className="legal-section">
          <div className="t-caption c-secondary">{t("warrant.charges")}</div>
          <ul className="legal-charges">
            <li>{t("warrant.charge.access")}</li>
            <li>{t("warrant.charge.theft", { count: soldCount })}</li>
            <li>{t("warrant.charge.heat")}</li>
          </ul>
        </div>

        <div className="legal-bail">
          <span className="t-caption c-secondary">{t("warrant.bail")}</span>
          <span className="t-title-large c-critical">{fmt.credits(bail)}</span>
          <span className="t-caption c-tertiary">{t("warrant.wallet", { balance: fmt.credits(balance), debt: fmt.credits(debt), limit: fmt.credits(DEBT_LIMIT) })}</span>
        </div>

        {error && <div className="t-caption c-critical">{error}</div>}
        {!canCash && !canLoan && <div className="t-caption c-caution">{t("warrant.cannotPay")}</div>}

        <div className="legal-actions">
          <Button variant="accent" disabled={!canCash} onClick={() => pay(false)}>
            {t("warrant.payCash", { amount: fmt.credits(bail) })}
          </Button>
          <Button disabled={!canLoan} onClick={() => pay(true)}>
            {t("warrant.payLoan", { amount: fmt.credits(bail) })}
          </Button>
          <Button variant="subtle" onClick={surrender}>
            {t("warrant.surrender")}
          </Button>
        </div>
      </div>
    </div>
  );
}
