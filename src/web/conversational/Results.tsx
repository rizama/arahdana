import { useId, useState } from "react";
import type { Result } from "../../domain/calculators/types";
import { money, percent } from "../config";
import { BinderDownloadTab } from "./DownloadTab";
import { getSpec, type Context, type Segment, type Spec } from "./specs";
import { DataTable } from "./structured";
import binderCss from "../emergency/emergency-binder.module.css";
import css from "./conversational.module.css";

const number = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;
const month = (value: number) => `${value.toLocaleString("id-ID")} bulan`;
const year = (value: number) => `${value.toLocaleString("id-ID")} tahun`;

type State = "success" | "almost" | "failed";
const titles: Record<State, string> = {
  success: "Strategi Sudah Cocok",
  almost: "Strategi Hampir Cocok",
  failed: "Strategi Belum Cocok",
};
const badges: Record<State, string> = {
  success: "SUDAH COCOK",
  almost: "HAMPIR COCOK",
  failed: "BELUM COCOK",
};

function StatusSeal({ state }: { state: State }) {
  const label = <span className={binderCss.statusSeal}>{badges[state]}</span>;
  if (state === "almost") return label;
  return (
    <div className={binderCss.statusEmblem}>
      <span className={binderCss.statusEmoji} aria-hidden="true">
        {state === "success" ? "🥳" : "🥺"}
        <span>{state === "success" ? "💚" : "💔"}</span>
      </span>
      {label}
    </div>
  );
}

function StatusIcon({ state }: { state: State }) {
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
      {state === "success" ? (
        <path d="m8 12 3 3 5-6" />
      ) : state === "almost" ? (
        <path d="M8 12h8" />
      ) : (
        <path d="M9 9l6 6m0-6-6 6" />
      )}
    </svg>
  );
}

function MetricIcon({
  kind,
}: {
  kind: "initial" | "payment" | "rate" | "duration" | "result";
}) {
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
      {kind === "initial" && (
        <>
          <path d="M19 11V9a4 4 0 0 0-8 0v2" />
          <rect height="10" rx="3" width="16" x="4" y="11" />
          <path d="M12 15v2" />
        </>
      )}
      {kind === "payment" && (
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
      {kind === "duration" && (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </>
      )}
      {kind === "result" && (
        <path d="M8 21h8m-4-4v4m-5-9H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v3a3 3 0 0 1-3 3h-1m-10 0a5 5 0 0 0 10 0V3H7v6z" />
      )}
    </svg>
  );
}

function InstrumentIcon({ index }: { index: number }) {
  const paths = [
    "M3 10h18M5 10v8M9 10v8M15 10v8M19 10v8M2 18h20M12 3 2 8h20L12 3Z",
    "m12 3 8 6-8 12L4 9l8-6Z",
    "M12 3v18M16 7H9.5a3 3 0 0 0 0 6h5a3 3 0 0 1 0 6H8",
    "M12 20V10M12 10c0-4 3.5-6 7-6-0.5 3.5-3 6-7 6ZM12 13c0-3.5-3.5-5.5-7-5.5 0.5 3.5 3 5.5 7 5.5Z",
    "M12 3 4 7v5c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V7l-8-4Z",
  ];
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[index % paths.length]} />
    </svg>
  );
}

function TargetIcon() {
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
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
    </svg>
  );
}

function metricKind(symbol: string): "initial" | "payment" | "rate" | "duration" | "result" {
  if (symbol === "+") return "payment";
  if (symbol === "%") return "rate";
  if (symbol === "◷") return "duration";
  if (symbol === "↗") return "result";
  return "initial";
}

function duration(rec: Result) {
  if (rec.duration_unit === "months") {
    const value = number(rec.months ?? rec.years);
    return value ? { value, text: month(value) } : null;
  }
  const value = number(rec.years);
  return value ? { value, text: year(value) } : null;
}

function period(spec: Spec, payload: Result) {
  return spec.slug === "annuity" && payload.frequency === "yearly" ? "tahun" : "bulan";
}

function instrumentNames(spec: Spec, rec: Result, horizonYears?: number) {
  if (spec.instruments) return [...spec.instruments];
  return horizonYears === undefined
    ? (rec.instruments as string[]) ?? []
    : durationInstruments(horizonYears);
}

export function durationInstruments(years: number) {
  if (years < 1) return ["Reksadana Pasar Uang", "Deposito Jangka Pendek"];
  if (years <= 5) return ["Reksadana Pendapatan Tetap", "Obligasi Negara"];
  if (years <= 10)
    return [
      "Saham",
      "Reksadana Indeks",
      "Reksadana Campuran",
      "Exchange-Traded Fund (ETF)",
      "Emas",
    ];
  return ["Saham", "Crypto", "Reksadana Indeks", "Exchange-Traded Fund (ETF)"];
}

function StatusDetail({ spec, context }: { spec: Spec; context: Context }) {
  const { result, rec, payload } = context;
  const state = result.strategy_state as State;
  const target = number(result.target);
  const projected = number(result.future_value);
  const gap = number(result.gap);
  const coverage = target > 0 ? (projected / target) * 100 : 100;
  const payment = money(number(rec.payment)) + "/" + period(spec, payload);
  const span = duration(rec);

  if (state === "failed") {
    return (
      <>
        <p>
          Proyeksi investasimu baru mencapai <strong>{percent(coverage)}</strong> dari target (
          <strong>{money(projected)}</strong> dari <strong>{money(target)}</strong>), sehingga
          masih ada kekurangan sebesar <strong>{money(gap)}</strong>.
        </p>
        {span ? (
          <p>
            Untuk menutup kekurangan ini, naikkan setoran rutin menjadi{" "}
            <strong>{payment}</strong> atau perpanjang durasi menjadi <strong>{span.text}</strong>.
            Lihat perbandingan lengkapnya di tab <strong>Rekomendasi</strong>.
          </p>
        ) : (
          <p>
            Dengan setoran saat ini target belum tercapai dalam batas simulasi{" "}
            {rec.duration_unit === "months" ? "1.200 bulan" : "100 tahun"}. Pertimbangkan menaikkan
            setoran rutin menjadi <strong>{payment}</strong> di tab <strong>Rekomendasi</strong>.
          </p>
        )}
      </>
    );
  }
  if (state === "almost") {
    return (
      <>
        <p>
          Proyeksi investasimu sudah mencapai <strong>{percent(coverage)}</strong> dari target (
          <strong>{money(projected)}</strong> dari <strong>{money(target)}</strong>), tersisa
          kekurangan <strong>{money(gap)}</strong>.
        </p>
        <p>
          Sedikit penyesuaian, misalnya setoran <strong>{payment}</strong>
          {span && (
            <>
              {" "}
              atau durasi <strong>{span.text}</strong>
            </>
          )}
          , sudah bisa menutupnya. Detailnya di tab <strong>Rekomendasi</strong>.
        </p>
      </>
    );
  }
  return (
    <>
      <p>
        Proyeksi investasimu mencapai <strong>{money(projected)}</strong> (
        <strong>{percent(coverage)}</strong> dari target <strong>{money(target)}</strong>)
        {projected > target ? (
          <>
            {" "}
            dengan kelebihan <strong>{money(projected - target)}</strong>
          </>
        ) : (
          " — tepat memenuhi target"
        )}
        .
      </p>
      <p>Strategi ini siap dijalankan.</p>
    </>
  );
}

function Breakdown({ result, prefix }: { result: Result; prefix?: string }) {
  const key = (name: string) => (prefix ? prefix + "_" + name : name);
  const principal = number(result[key("principal")]);
  const interest = number(result[prefix ? prefix + "_interest" : "interest_earned"]);
  const principalShare = number(result[key("principal_percent")]);
  const interestShare = number(result[key("interest_percent")]);
  const first = Math.max(0, Math.min(100, principalShare));
  const second = Math.max(0, Math.min(100 - first, interestShare));

  return (
    <section className={binderCss.binderCard}>
      <div className={binderCss.binderCardHead}>
        <h3>Pokok vs Imbal Hasil</h3>
        <span className={binderCss.binderCardNote}>komposisi modal vs hasil bunga</span>
      </div>
      <svg
        className={binderCss.breakdownSvg}
        viewBox="0 0 100 10"
        preserveAspectRatio="none"
        role="img"
        aria-label={`Pokok ${percent(principalShare)} (${money(principal)}) dan Imbal hasil ${percent(interestShare)} (${money(interest)})`}
      >
        <rect className={binderCss.barPokok} x="0" y="0" width={first} height="10" />
        <rect className={binderCss.barBunga} x={first} y="0" width={second} height="10" />
      </svg>
      <div className={binderCss.legendGrid}>
        <div className={binderCss.legendItem}>
          <div className={binderCss.legendDotRow}>
            <span className={binderCss.dotPokok} aria-hidden="true" />
            <span>Pokok ({percent(principalShare)})</span>
          </div>
          <strong>{money(principal)}</strong>
        </div>
        <div className={binderCss.legendItem + " " + binderCss.legendItemRight}>
          <div className={binderCss.legendDotRow + " " + binderCss.legendDotRowRight}>
            <span>Imbal hasil ({percent(interestShare)})</span>
            <span className={binderCss.dotBunga} aria-hidden="true" />
          </div>
          <strong>{money(interest)}</strong>
        </div>
      </div>
    </section>
  );
}

function Instruments({ names, subtitle }: { names: string[]; subtitle?: string }) {
  return (
    <section className={binderCss.binderCard}>
      <div className={binderCss.binderCardHead}>
        <h3>Pilihan Investasi</h3>
        <span className={binderCss.binderCardNote}>
          {subtitle ?? "sesuai horizon waktumu"}
        </span>
      </div>
      <ul className={binderCss.pills}>
        {names.map((name, index) => (
          <li key={name}>
            <InstrumentIcon index={index} />
            <span>{name}</span>
          </li>
        ))}
      </ul>
      <small className={css.cardCaption}>
        Kenali risiko dan waktu pencairan sebelum memilih instrumen.
      </small>
    </section>
  );
}

function Strategy({ spec, context }: { spec: Spec; context: Context }) {
  const { result, rec } = context;
  const state = result.strategy_state as State;
  const target = number(result.target);
  const projected = number(result.future_value);
  const gap = number(result.gap);
  const metricRows = spec.metrics(context);
  const timeline = Array.isArray(result.timeline)
    ? (result.timeline as Result[])
    : [];
  const gapNote =
    gap > 0
      ? `Kekurangan: ${money(gap)} dari target`
      : projected > target
        ? `Kelebihan: ${money(projected - target)} di atas target`
        : "Pas mencapai target";

  return (
    <>
      <div className={binderCss.statusBanner} data-status={state}>
        <div className={binderCss.statusCopy}>
          <strong className={binderCss.statusTitle}>
            <StatusIcon state={state} />
            {titles[state]}
          </strong>
          <StatusDetail spec={spec} context={context} />
        </div>
        <StatusSeal state={state} />
      </div>

      <section
        className={binderCss.targetBanner}
        data-tone={state === "success" ? "success" : "danger"}
      >
        <div className={binderCss.targetLeft}>
          <div className={binderCss.targetIconBox}>
            <TargetIcon />
          </div>
          <div>
            <p className={binderCss.targetEyebrow}>Target Akumulasi Pokok</p>
            <h3 className={binderCss.targetTitle}>{spec.targetTitle}</h3>
          </div>
        </div>
        <div className={binderCss.targetRight}>
          <strong className={binderCss.targetAmount}>{money(target)}</strong>
          {spec.targetNote?.(context) && (
            <p className={binderCss.targetSub}>{spec.targetNote(context)}</p>
          )}
        </div>
      </section>

      {spec.showAllocation && (
        <section className={binderCss.binderCard}>
          <div className={binderCss.binderCardHead}>
            <h3>Alokasi Dana Darurat</h3>
            <span className={binderCss.binderCardNote}>50% likuid : 50% bertumbuh</span>
          </div>
          <div
            className={binderCss.allocBar}
            role="img"
            aria-label={`Alokasi 50% Tabungan Likuid (${money(target * 0.5)}) dan 50% Instrumen investasi (${money(target * 0.5)})`}
          >
            <span className={binderCss.allocLiquid}>50%</span>
            <span className={binderCss.allocInvest}>50%</span>
          </div>
          <div className={binderCss.legendGrid}>
            <div className={binderCss.legendItem}>
              <span>50% Tabungan Likuid</span>
              <strong>{money(target * 0.5)}</strong>
            </div>
            <div className={binderCss.legendItem + " " + binderCss.legendItemRight}>
              <span>50% Instrumen investasi</span>
              <strong>{money(target * 0.5)}</strong>
            </div>
          </div>
          <small className={css.cardCaption}>
            Prioritaskan dana yang cepat cair dan berisiko rendah.
          </small>
        </section>
      )}

      <section className={binderCss.binderCard}>
        <div className={binderCss.binderCardHead}>
          <h3>Strategimu</h3>
          <span className={binderCss.binderCardNote}>rincian parameter saat ini</span>
        </div>
        <div className={binderCss.paramList}>
          {metricRows.map(([icon, label, value]) => {
            const kind = metricKind(icon);
            const isResult = kind === "result";
            return (
              <div className={binderCss.paramRow} key={label + icon}>
                <div className={binderCss.paramMain}>
                  <div
                    className={
                      binderCss.paramIcon +
                      (isResult && gap === 0 ? " " + binderCss.paramIconSuccess : "")
                    }
                  >
                    <MetricIcon kind={kind} />
                  </div>
                  <div>
                    <p className={binderCss.paramLabel}>{label}</p>
                    <p className={binderCss.paramValue}>{value}</p>
                    {isResult && (
                      <p
                        className={
                          binderCss.paramSub +
                          (gap > 0 ? " " + binderCss.paramSubError : "")
                        }
                      >
                        {gapNote}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <Instruments names={instrumentNames(spec, rec)} />

      <Breakdown result={result} />

      {timeline.length > 0 && (
        <details className={binderCss.binderCard + " " + css.binderDetails}>
          <summary className={css.binderSummary}>
            <span>Timeline Proyeksi Tahunan</span>
            <span className={css.summaryCount}>
              {timeline.length.toLocaleString("id-ID")} tahun
            </span>
          </summary>
          <DataTable
            embedded
            caption="Timeline Proyeksi Tahunan"
            data={timeline}
            columns={[
              ["year", "Tahun", "number"],
              ["value", "Nilai investasi", "money"],
            ]}
          />
        </details>
      )}

      {spec.extras?.(context)}
    </>
  );
}

export function ReturnPanel({
  rec,
  payload,
  names,
}: {
  rec: Result;
  payload: Result;
  names?: string[];
}) {
  const reaches = rec.return_reaches_target === true;
  const fromRate = percent(number(payload.rate)) + "/tahun";
  const toRate = percent(number(rec.return_percent)) + "/tahun";
  const projected = number(rec.return_value);

  return (
    <>
      <section className={binderCss.binderCard}>
        <div className={binderCss.binderCardHead}>
          <h3>Asumsi return</h3>
          <span className={binderCss.binderCardNote}>penyesuaian tingkat imbal hasil</span>
        </div>

        <div className={binderCss.paramList}>
          <div className={binderCss.paramRow}>
            <div className={binderCss.paramMain}>
              <div className={binderCss.paramIcon}>
                <MetricIcon kind="rate" />
              </div>
              <div>
                <p className={binderCss.paramLabel}>Asumsi return tahunan</p>
                <div className={binderCss.diffRow} aria-hidden="true">
                  <span className={binderCss.strikeOld}>{fromRate}</span>
                  <span>▸</span>
                  <strong className={binderCss.highlightYellow}>{toRate}</strong>
                </div>
                <span className={binderCss.srOnly}>
                  Dari {percent(number(payload.rate))} per tahun menjadi{" "}
                  {percent(number(rec.return_percent))} per tahun.
                </span>
              </div>
            </div>
            <span className={binderCss.paramBadge}>Return Uji</span>
          </div>

          <div className={binderCss.paramRow}>
            <div className={binderCss.paramMain}>
              <div
                className={
                  binderCss.paramIcon +
                  (reaches ? " " + binderCss.paramIconSuccess : "")
                }
              >
                <MetricIcon kind="result" />
              </div>
              <div>
                <p className={binderCss.paramLabel}>Proyeksi baru</p>
                <p className={binderCss.paramValue}>
                  <strong
                    className={
                      reaches ? binderCss.highlightGreen : binderCss.highlightYellow
                    }
                  >
                    {money(projected)}
                  </strong>
                </p>
                <p className={binderCss.paramSub}>
                  {reaches
                    ? "Target tercapai pada asumsi return ini."
                    : "Belum mencapai target dalam batas asumsi return simulasi (maksimal 15%/20%/30% sesuai durasi)."}
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className={css.noticeBox + " " + css.noticeBoxWarn}>
          Return adalah asumsi simulasi, bukan jaminan hasil.
        </p>
      </section>

      <Breakdown result={rec} prefix="return" />

      <Instruments names={names ?? (rec.instruments as string[]) ?? []} />
    </>
  );
}

function Recommendation({
  spec,
  context,
  initialSegment,
}: {
  spec: Spec;
  context: Context;
  initialSegment?: Segment;
}) {
  const [option, setOption] = useState<Segment>(initialSegment ?? spec.options[0]);
  const id = useId();
  const { result, rec, payload } = context;

  if (result.strategy_state === "success" && !spec.options.includes("return")) {
    return (
      <div className={binderCss.statusBanner} data-status="success">
        <div className={binderCss.statusCopy}>
          <strong className={binderCss.statusTitle}>
            <StatusIcon state="success" />
            Strategimu sudah memenuhi target
          </strong>
          <p>Kamu bisa mempertahankan rencana setoran dan durasi ini.</p>
        </div>
        <StatusSeal state="success" />
      </div>
    );
  }

  const target = number(result.target);
  const span = duration(rec);
  const periodLabel = period(spec, payload);
  const durationFrom = spec.durationFrom(context);
  const isDuration = option === "duration";
  const isReturn = option === "return";
  const instruments = instrumentNames(spec, rec, number(rec.years ?? payload.years));

  const targetDanger =
    (isDuration && !span) || (isReturn && rec.return_reaches_target !== true);

  const newPayment = number(rec.payment);
  const newProjection = number(isDuration ? rec.years_value : rec.payment_value);
  const isMonthlyUnit = rec.duration_unit === "months";
  const origDurationValue = isMonthlyUnit
    ? Math.round(number(payload.years) * 12)
    : number(result.years || payload.years);
  const targetDurationValue = isDuration ? (span?.value ?? 0) : origDurationValue;
  const hasTimeline = targetDurationValue > 0 && newProjection > 0;

  return (
    <>
      {result.strategy_state === "success" && (
        <div className={binderCss.statusBanner} data-status="success">
          <div className={binderCss.statusCopy}>
            <strong className={binderCss.statusTitle}>
              <StatusIcon state="success" />
              Strategimu sudah memenuhi target
            </strong>
            <p>
              Kamu bisa mempertahankan rencana setoran dan durasi ini, atau membandingkan opsi
              penyesuaian di bawah.
            </p>
          </div>
          <StatusSeal state="success" />
        </div>
      )}

      <fieldset className={binderCss.segmentFieldset}>
        <legend>Pilih tipe rekomendasi</legend>
        <div
          className={
            binderCss.segmentTray +
            (spec.options.length === 3 ? " " + css.segmentTrayThree : "")
          }
        >
          {spec.options.map((segment) => {
            const checked = option === segment;
            const label = {
              payment: "Nominal",
              duration: "Durasi",
              return: "Return",
            }[segment];
            const chip = {
              payment: periodLabel === "tahun" ? "Fokus Tahunan" : "Fokus Bulanan",
              duration: "Fokus Durasi",
              return: "Fokus Return",
            }[segment];
            return (
              <label key={segment} className={binderCss.segmentLabel}>
                <input
                  className={binderCss.srOnly}
                  type="radio"
                  name={id}
                  value={segment}
                  checked={checked}
                  onChange={() => setOption(segment)}
                />
                <span className={binderCss.segmentFace}>
                  <span>{label}</span>
                  {checked && <span className={binderCss.segmentChip}>{chip}</span>}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <section
        className={binderCss.targetBanner}
        data-tone={targetDanger ? "danger" : "success"}
      >
        <div className={binderCss.targetLeft}>
          <div className={binderCss.targetIconBox}>
            <TargetIcon />
          </div>
          <div>
            <p className={binderCss.targetEyebrow}>Target Akumulasi Pokok</p>
            <h3 className={binderCss.targetTitle}>{spec.targetTitle}</h3>
          </div>
        </div>
        <div className={binderCss.targetRight}>
          <strong className={binderCss.targetAmount}>{money(target)}</strong>
          {spec.targetNote?.(context) && (
            <p className={binderCss.targetSub}>{spec.targetNote(context)}</p>
          )}
        </div>
      </section>

      {isReturn ? (
        <ReturnPanel
          rec={rec}
          payload={payload}
          names={instrumentNames(spec, rec)}
        />
      ) : isDuration && !span ? (
        <section className={binderCss.binderCard}>
          <div className={binderCss.binderCardHead}>
            <h3>Target belum tercapai dalam batas simulasi</h3>
          </div>
          <p className={binderCss.paramSub}>
            Dengan setoran saat ini, target belum tercapai dalam batas simulasi{" "}
            {isMonthlyUnit ? "1.200 bulan" : "100 tahun"}. Pilih Nominal untuk melihat setoran
            rutin yang perlu disiapkan.
          </p>
          <div>
            <button
              type="button"
              className={binderCss.btnSheetPrimary}
              onClick={() => setOption("payment")}
            >
              Lihat rekomendasi Nominal →
            </button>
          </div>
        </section>
      ) : (
        <>
          <section className={binderCss.binderCard}>
            <div className={binderCss.binderCardHead}>
              <h3>Rincian Parameter Rekomendasi</h3>
              <span className={binderCss.binderCardNote}>
                {isDuration
                  ? "penyesuaian durasi waktu"
                  : `penyesuaian setoran ${periodLabel}an`}
              </span>
            </div>

            <div className={binderCss.paramList}>
              <div className={binderCss.paramRow}>
                <div className={binderCss.paramMain}>
                  <div className={binderCss.paramIcon}>
                    <MetricIcon kind="initial" />
                  </div>
                  <div>
                    <p className={binderCss.paramLabel}>Dana awal</p>
                    <p className={binderCss.paramValue}>{money(number(payload.initial))}</p>
                  </div>
                </div>
                <span className={binderCss.paramBadge}>Saldo Awal</span>
              </div>

              <div className={binderCss.paramRow}>
                <div className={binderCss.paramMain}>
                  <div className={binderCss.paramIcon}>
                    <MetricIcon kind="payment" />
                  </div>
                  <div>
                    <p className={binderCss.paramLabel}>Setoran {periodLabel}</p>
                    {!isDuration ? (
                      <>
                        <div className={binderCss.diffRow} aria-hidden="true">
                          <span className={binderCss.strikeOld}>
                            {money(number(payload.payment))}/{periodLabel}
                          </span>
                          <span>▸</span>
                          <strong className={binderCss.highlightYellow}>
                            {money(newPayment)}/{periodLabel}
                          </strong>
                        </div>
                        <span className={binderCss.srOnly}>
                          Dari {money(number(payload.payment))} per {periodLabel} menjadi{" "}
                          {money(newPayment)} per {periodLabel}.
                        </span>
                      </>
                    ) : (
                      <p className={binderCss.paramValue}>
                        {money(number(payload.payment))}/{periodLabel}
                      </p>
                    )}
                  </div>
                </div>
                <span className={binderCss.paramBadge}>
                  {!isDuration ? "Setoran Baru" : "Tetap Terjangkau"}
                </span>
              </div>

              <div className={binderCss.paramRow}>
                <div className={binderCss.paramMain}>
                  <div className={binderCss.paramIcon}>
                    <MetricIcon kind="rate" />
                  </div>
                  <div>
                    <p className={binderCss.paramLabel}>Return asumsi</p>
                    <p className={binderCss.paramValue}>
                      {percent(number(payload.rate))}/tahun
                    </p>
                  </div>
                </div>
              </div>

              <div className={binderCss.paramRow}>
                <div className={binderCss.paramMain}>
                  <div className={binderCss.paramIcon}>
                    <MetricIcon kind="duration" />
                  </div>
                  <div>
                    <p className={binderCss.paramLabel}>Durasi investasi</p>
                    {isDuration && span ? (
                      <>
                        <div className={binderCss.diffRow} aria-hidden="true">
                          <span className={binderCss.strikeOld}>{durationFrom}</span>
                          <span>▸</span>
                          <strong className={binderCss.highlightYellow}>{span.text}</strong>
                        </div>
                        <span className={binderCss.srOnly}>
                          Dari {durationFrom} menjadi {span.text}.
                        </span>
                      </>
                    ) : (
                      <p className={binderCss.paramValue}>{durationFrom}</p>
                    )}
                  </div>
                </div>
                <span className={binderCss.paramBadge}>
                  {isDuration ? "Penyesuaian Durasi" : "Durasi Awal"}
                </span>
              </div>

              <div className={binderCss.paramRow}>
                <div className={binderCss.paramMain}>
                  <div
                    className={
                      binderCss.paramIcon + " " + binderCss.paramIconSuccess
                    }
                  >
                    <MetricIcon kind="result" />
                  </div>
                  <div>
                    <p className={binderCss.paramLabel}>Proyeksi baru</p>
                    <p className={binderCss.paramValue}>
                      <strong className={binderCss.highlightGreen}>
                        {money(newProjection)}
                      </strong>
                    </p>
                    {newProjection >= target && (
                      <p className={binderCss.paramSub}>✓ Memenuhi target</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <Breakdown
            result={rec}
            prefix={isDuration ? "duration" : "payment"}
          />

          <Instruments
            names={isDuration ? instruments : instrumentNames(spec, rec)}
          />

          {hasTimeline && (
            <section className={binderCss.binderCard}>
              <div className={binderCss.binderCardHead}>
                <h3>Timeline Rekomendasi</h3>
                <span className={binderCss.paramBadge}>
                  {isMonthlyUnit
                    ? month(targetDurationValue)
                    : year(targetDurationValue)}
                </span>
              </div>
              <div className={binderCss.verticalTimeline}>
                <div className={binderCss.timelineNode}>
                  <span className={binderCss.timelineMeta}>
                    {isMonthlyUnit ? "Bulan 1" : "Tahun 1"} · Awal rencana
                  </span>
                  <p className={binderCss.timelineLabel}>Dana awal</p>
                  <span className={binderCss.timelineAmount}>
                    {money(number(payload.initial))}
                  </span>
                </div>
                <div
                  className={
                    binderCss.timelineNode + " " + binderCss.timelineNodeFinish
                  }
                >
                  <span className={binderCss.timelineMeta}>
                    {isMonthlyUnit
                      ? `Bulan ${targetDurationValue.toLocaleString("id-ID")}`
                      : `Tahun ${targetDurationValue.toLocaleString("id-ID")}`}{" "}
                    · Akhir simulasi
                  </span>
                  <p className={binderCss.timelineLabel}>
                    Proyeksi investasi rekomendasi
                  </p>
                  <span
                    className={
                      binderCss.timelineAmount +
                      " " +
                      binderCss.timelineAmountFinish
                    }
                  >
                    {money(newProjection)}
                  </span>
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}

function Downloads({
  spec,
  result,
  initialExportTheme,
}: {
  spec: Spec;
  result: Result;
  initialExportTheme?: "light" | "dark" | null;
}) {
  return (
    <BinderDownloadTab
      slug={spec.slug}
      title={spec.title}
      exportTitle={spec.exportTitle}
      result={result}
      nameLabel={spec.downloadName?.label}
      nameKey={spec.downloadName?.key}
      previewMetricLabel="Target Dana"
      previewAmount={number(result.target)}
      showComposition
      initialExportTheme={initialExportTheme}
    />
  );
}

export function ConversationalResults({
  spec,
  result,
  payload,
  answers,
  extra,
  tab,
  initialSegment,
  initialExportTheme,
}: {
  spec: Spec;
  result: Result;
  payload: Result;
  answers?: Record<string, string>;
  extra?: Record<string, unknown>;
  tab: number;
  initialSegment?: Segment;
  initialExportTheme?: "light" | "dark" | null;
}) {
  const context: Context = {
    spec,
    result,
    payload,
    answers,
    extra,
    rec: result.recommendations as Result,
  };
  if (tab === 0) return <Strategy spec={spec} context={context} />;
  if (tab === 1) {
    return (
      <Recommendation
        spec={spec}
        context={context}
        initialSegment={initialSegment}
      />
    );
  }
  return (
    <Downloads
      spec={spec}
      result={result}
      initialExportTheme={initialExportTheme}
    />
  );
}

export function EmergencyResults({
  result,
  input,
  tab,
}: {
  result: Result;
  input: Result;
  tab: number;
}) {
  return (
    <ConversationalResults
      spec={getSpec("dana-darurat")}
      result={result}
      payload={input}
      tab={tab}
    />
  );
}
