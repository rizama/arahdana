import type { Result } from "../../domain/calculators/types";
import { money, percent } from "../config";
import { BinderDownloadTab } from "./DownloadTab";
import { DataTable } from "./structured";
import binderCss from "../emergency/emergency-binder.module.css";
import css from "./conversational.module.css";

const num = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;
const record = (value: unknown): Result =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Result)
    : {};

function HomeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 11 12 3 21 11" />
      <path d="M5 10v11h14V10" />
      <path d="M10 21v-7h4v7" />
    </svg>
  );
}

function ParamSvg({ kind }: { kind: "money" | "rate" | "fee" | "total" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {kind === "money" && (
        <>
          <rect height="12" rx="2" width="20" x="2" y="6" />
          <circle cx="12" cy="12" r="2" />
        </>
      )}
      {kind === "rate" && (
        <>
          <circle cx="7.5" cy="7.5" r="2" />
          <circle cx="16.5" cy="16.5" r="2" />
          <path d="M5 19 19 5" />
        </>
      )}
      {kind === "fee" && (
        <>
          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
          <rect x="9" y="3" width="6" height="4" rx="1" />
          <path d="M9 12h6M9 16h4" />
        </>
      )}
      {kind === "total" && (
        <path d="M8 21h8m-4-4v4m-5-9H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v3a3 3 0 0 1-3 3h-1m-10 0a5 5 0 0 0 10 0V3H7v6z" />
      )}
    </svg>
  );
}

function StatusIcon({ status }: { status: "success" | "almost" | "failed" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      {status === "success" ? (
        <path d="m8 12 3 3 5-6" />
      ) : status === "almost" ? (
        <path d="M8 12h8" />
      ) : (
        <path d="M9 9l6 6m0-6-6 6" />
      )}
    </svg>
  );
}

function MetricRow({
  label,
  value,
  kind = "money",
  sub,
  emphasize = false,
}: {
  label: string;
  value: unknown;
  kind?: "money" | "rate" | "fee" | "total";
  sub?: string;
  emphasize?: boolean;
}) {
  return (
    <div
      className={
        binderCss.paramRow + (emphasize ? " " + css.totalRow : "")
      }
    >
      <div className={binderCss.paramMain}>
        <div
          className={
            binderCss.paramIcon +
            (emphasize ? " " + binderCss.paramIconSuccess : "")
          }
        >
          <ParamSvg kind={kind} />
        </div>
        <div>
          <p className={binderCss.paramLabel}>{label}</p>
          <p className={binderCss.paramValue}>
            {typeof value === "number" ? money(value) : "—"}
          </p>
          {sub && <p className={binderCss.paramSub}>{sub}</p>}
        </div>
      </div>
    </div>
  );
}

function Summary({ result }: { result: Result }) {
  const affordability = result.affordability ? record(result.affordability) : null;
  const payoff = affordability?.accelerated_payoff
    ? record(affordability.accelerated_payoff)
    : null;
  const timeline = (result.timeline as Result[]) ?? [];
  const rawStatus = String(affordability?.status ?? "");
  const bannerStatus: "success" | "almost" | "failed" =
    rawStatus === "berbahaya"
      ? "failed"
      : rawStatus === "tidak_sehat"
        ? "almost"
        : "success";
  const bannerDanger =
    rawStatus === "tidak_sehat" || rawStatus === "berbahaya";

  return (
    <>
      <section
        className={binderCss.targetBanner}
        data-tone={bannerDanger ? "danger" : "success"}
      >
        <div className={binderCss.targetLeft}>
          <div className={binderCss.targetIconBox}>
            <HomeIcon />
          </div>
          <div>
            <p className={binderCss.targetEyebrow}>POKOK PINJAMAN KPR</p>
            <h3 className={binderCss.targetTitle}>
              Cicilan pertama: {money(num(result.first_payment))}
            </h3>
          </div>
        </div>
        <div className={binderCss.targetRight}>
          <strong className={binderCss.targetAmount}>
            {money(num(result.principal))}
          </strong>
          <p className={binderCss.targetSub}>
            Total bunga terhadap pokok:{" "}
            <strong className={css.tabular}>
              {percent(num(result.total_interest_percent))}
            </strong>
          </p>
        </div>
      </section>

      <section className={binderCss.binderCard}>
        <div className={binderCss.binderCardHead}>
          <h3>Ringkasan pinjaman</h3>
          <span className={binderCss.binderCardNote}>ikhtisar kredit KPR</span>
        </div>
        <div className={binderCss.paramList}>
          <MetricRow label="Pokok pinjaman" value={result.principal} kind="money" />
          <MetricRow label="Cicilan pertama" value={result.first_payment} kind="rate" />
          <MetricRow
            label="Total bunga"
            value={result.total_interest}
            kind="total"
            sub={`Total bunga terhadap pokok: ${percent(num(result.total_interest_percent))}`}
          />
        </div>
      </section>

      <section className={binderCss.binderCard}>
        <div className={binderCss.binderCardHead}>
          <h3>Kelayakan Cicilan</h3>
          <span className={binderCss.binderCardNote}>4 rasio terhadap penghasilan</span>
        </div>

        {affordability ? (
          <div className={binderCss.statusBanner} data-status={bannerStatus}>
            <div className={binderCss.statusCopy}>
              <strong className={binderCss.statusTitle}>
                <StatusIcon status={bannerStatus} />
                {String(affordability.label ?? "")}
              </strong>
              <p>
                <strong>{String(affordability.label ?? "")}</strong> —{" "}
                {String(affordability.advice ?? "")}
              </p>
              <p>
                Rasio cicilan {percent(num(affordability.ratio_min_percent))}–
                {percent(num(affordability.ratio_max_percent))}.
              </p>
            </div>
            <span className={binderCss.statusSeal}>
              {String(affordability.label ?? "").toUpperCase()}
            </span>
          </div>
        ) : (
          <p className={css.noticeBox + " " + css.noticeBoxInfo}>
            Penghasilan kosong atau 0 melewati evaluasi rasio. Isi penghasilan bulanan untuk
            mengevaluasi beban cicilan.
          </p>
        )}

        <ul className={css.tierGrid}>
          <li className={css.tierItem}>&lt;15%: Sangat Sehat</li>
          <li className={css.tierItem}>15–&lt;30%: Sehat</li>
          <li className={css.tierItem}>30–&lt;50%: Tidak Sehat</li>
          <li className={css.tierItem}>≥50%: Berbahaya</li>
        </ul>

        {payoff && (
          <div className={css.payoffBox}>
            <h4>Pelunasan dipercepat</h4>
            <p>
              {money(num(payoff.low_payment))} / bulan saat fix dan{" "}
              {money(num(payoff.high_payment))} saat floating.
            </p>
            <p>
              {payoff.feasible
                ? `Estimasi ${num(payoff.estimated_months)} bulan.`
                : "Tidak tercapai dalam batas simulasi."}{" "}
              {String(payoff.note ?? "")}
            </p>
          </div>
        )}
      </section>

      <details className={binderCss.binderCard + " " + css.binderDetails}>
        <summary className={css.binderSummary}>
          <span>Jadwal cicilan bulanan</span>
          <span className={css.summaryCount}>
            {timeline.length.toLocaleString("id-ID")} bulan
          </span>
        </summary>
        <DataTable
          embedded
          caption="Jadwal cicilan bulanan"
          data={timeline}
          columns={[
            ["month", "Bulan", "number"],
            ["payment", "Cicilan", "money"],
            ["interest", "Bunga", "money"],
            ["balance", "Sisa pokok", "money"],
          ]}
        />
      </details>
    </>
  );
}

function Costs({ result }: { result: Result }) {
  const fees = record(result.fees);
  return (
    <>
      <section className={binderCss.binderCard}>
        <div className={binderCss.binderCardHead}>
          <h3>Bunga dan sisa pokok</h3>
          <span className={binderCss.binderCardNote}>perbandingan masa fix vs floating</span>
        </div>
        <div className={binderCss.paramList}>
          <MetricRow label="Total bunga fix" value={result.fixed_interest} kind="rate" />
          <MetricRow
            label="Total bunga floating"
            value={result.floating_interest}
            kind="rate"
          />
          <MetricRow
            label="Sisa setelah fix"
            value={result.balance_after_fixed}
            kind="money"
          />
          <MetricRow label="Cicilan minimum" value={result.min_payment} kind="money" />
          <MetricRow label="Cicilan maksimum" value={result.max_payment} kind="money" />
        </div>
      </section>

      <section className={binderCss.binderCard}>
        <div className={binderCss.binderCardHead}>
          <h3>Estimasi biaya transaksi</h3>
          <span className={binderCss.binderCardNote}>7 komponen biaya awal + total</span>
        </div>
        <div className={binderCss.paramList}>
          {(
            [
              ["ajb", "AJB", "fee", false],
              ["balik_nama", "Balik nama", "fee", false],
              ["notaris", "Notaris", "fee", false],
              ["provisi", "Provisi", "fee", false],
              ["appraisal", "Appraisal", "fee", false],
              ["admin", "Admin", "fee", false],
              ["bphtb", "BPHTB", "fee", false],
              ["total_bank_fees", "Total biaya bank", "total", true],
              ["total_other_fees", "Total biaya lain", "total", true],
            ] as const
          ).map(([key, label, kind, emphasize]) => (
            <MetricRow
              key={key}
              label={label}
              value={fees[key]}
              kind={kind}
              emphasize={emphasize}
            />
          ))}
        </div>
        <p
          className={
            css.noticeBox +
            " " +
            (fees.bphtb_included ? css.noticeBoxSuccess : css.noticeBoxInfo)
          }
        >
          {fees.bphtb_included
            ? "BPHTB dimasukkan berdasarkan NJOP-TKP."
            : "BPHTB belum dimasukkan; isi NJOP-TKP untuk menghitungnya."}{" "}
          Biaya mengikuti model simulasi, bukan penawaran bank atau penetapan pajak.
        </p>
      </section>
    </>
  );
}

export function KprResults({
  result,
  tab,
  initialExportTheme = null,
}: {
  result: Result;
  tab: number;
  initialExportTheme?: "light" | "dark" | null;
}) {
  if (tab === 0) return <Summary result={result} />;
  if (tab === 1) return <Costs result={result} />;
  return (
    <BinderDownloadTab
      slug="simulasi-kpr"
      title="Simulasi KPR"
      exportTitle="Simulasi KPR"
      result={result}
      previewMetricLabel="Pokok Pinjaman"
      previewAmount={num(result.principal)}
      showComposition={false}
      initialExportTheme={initialExportTheme}
    />
  );
}
