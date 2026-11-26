import { useId, useState } from "react";
import type { Result } from "../../domain/calculators/types";
import { money, percent } from "../config";
import { durationInstruments } from "../conversational/Results";
import type { Segment } from "../conversational/specs";
import { downloadPng } from "../export/render-png";
import { EMERGENCY_INSTRUMENTS, emergencyMultiplier } from "./summary";
import css from "./emergency-binder.module.css";

export { durationInstruments };

const num = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;
const monthText = (value: number) => `${value.toLocaleString("id-ID")} bulan`;

type State = "success" | "almost" | "failed";
const statusTitles: Record<State, string> = {
  success: "Strategi Sudah Cocok",
  almost: "Strategi Hampir Cocok",
  failed: "Strategi Belum Cocok",
};
const statusBadges: Record<State, string> = {
  success: "SUDAH COCOK",
  almost: "HAMPIR COCOK",
  failed: "BELUM COCOK",
};

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

function MetricIcon({ kind }: { kind: "initial" | "payment" | "rate" | "duration" | "result" }) {
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

function recDuration(rec: Result) {
  const value = num(rec.months ?? rec.years);
  return value ? { value, text: monthText(value) } : null;
}

function targetMultiplierNote(input: Result) {
  const married = input.married === true;
  const dependents = num(input.dependents);
  const multiplier = emergencyMultiplier(married, dependents);
  return `${multiplier}× pengeluaran wajib bulanan (${married ? "Sudah menikah" : "Belum menikah"}, ${dependents} tanggungan)`;
}

function BreakdownSection({ result, prefix }: { result: Result; prefix?: string }) {
  const key = (name: string) => (prefix ? prefix + "_" + name : name);
  const principal = num(result[key("principal")]);
  const interest = num(result[prefix ? prefix + "_interest" : "interest_earned"]);
  const principalShare = num(result[key("principal_percent")]);
  const interestShare = num(result[key("interest_percent")]);
  const first = Math.max(0, Math.min(100, principalShare));
  const second = Math.max(0, Math.min(100 - first, interestShare));

  return (
    <section className={css.binderCard}>
      <div className={css.binderCardHead}>
        <h3>Pokok vs Imbal Hasil</h3>
        <span className={css.binderCardNote}>komposisi modal vs hasil bunga</span>
      </div>
      <svg
        className={css.breakdownSvg}
        viewBox="0 0 100 10"
        preserveAspectRatio="none"
        role="img"
        aria-label={`Pokok ${percent(principalShare)} (${money(principal)}) dan Imbal hasil ${percent(interestShare)} (${money(interest)})`}
      >
        <rect className={css.barPokok} x="0" y="0" width={first} height="10" />
        <rect className={css.barBunga} x={first} y="0" width={second} height="10" />
      </svg>
      <div className={css.legendGrid}>
        <div className={css.legendItem}>
          <div className={css.legendDotRow}>
            <span className={css.dotPokok} aria-hidden="true" />
            <span>Pokok ({percent(principalShare)})</span>
          </div>
          <strong>{money(principal)}</strong>
        </div>
        <div className={css.legendItem + " " + css.legendItemRight}>
          <div className={css.legendDotRow + " " + css.legendDotRowRight}>
            <span>Imbal hasil ({percent(interestShare)})</span>
            <span className={css.dotBunga} aria-hidden="true" />
          </div>
          <strong>{money(interest)}</strong>
        </div>
      </div>
    </section>
  );
}

function InstrumentsCard() {
  return (
    <section className={css.binderCard}>
      <div className={css.binderCardHead}>
        <h3>Pilihan Investasi</h3>
        <span className={css.binderCardNote}>likuid dan rendah risiko</span>
      </div>
      <ul className={css.pills}>
        {EMERGENCY_INSTRUMENTS.map((name, index) => (
          <li key={name}>
            <InstrumentIcon index={index} />
            <span>{name}</span>
          </li>
        ))}
      </ul>
      <small>Kenali risiko dan waktu pencairan sebelum memilih instrumen.</small>
    </section>
  );
}

function StatusDetail({ result, rec }: { result: Result; rec: Result }) {
  const state = result.strategy_state as State;
  const target = num(result.target);
  const projected = num(result.future_value);
  const gap = num(result.gap);
  const coverage = target > 0 ? (projected / target) * 100 : 100;
  const payment = money(num(rec.payment)) + "/bulan";
  const span = recDuration(rec);

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
            Dengan setoran saat ini target belum tercapai dalam batas simulasi 1.200 bulan.
            Pertimbangkan menaikkan setoran rutin menjadi <strong>{payment}</strong> di tab{" "}
            <strong>Rekomendasi</strong>.
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

function StrategyTab({ result, input }: { result: Result; input: Result }) {
  const rec = result.recommendations as Result;
  const state = result.strategy_state as State;
  const target = num(result.target);
  const projected = num(result.future_value);
  const gap = num(result.gap);
  const months = Math.round(num(input.years) * 12);
  const timeline = (result.timeline as Result[]) ?? [];

  return (
    <>
      <div className={css.statusBanner} data-status={state}>
        <div className={css.statusCopy}>
          <strong className={css.statusTitle}>
            <StatusIcon state={state} />
            {statusTitles[state]}
          </strong>
          <StatusDetail result={result} rec={rec} />
        </div>
        <span className={css.statusSeal}>{statusBadges[state]}</span>
      </div>

      <section className={css.targetBanner}>
        <div className={css.targetLeft}>
          <div className={css.targetIconBox}>
            <TargetIcon />
          </div>
          <div>
            <p className={css.targetEyebrow}>Target Akumulasi Pokok</p>
            <h3 className={css.targetTitle}>Dana darurat yang kamu butuhkan</h3>
          </div>
        </div>
        <div className={css.targetRight}>
          <strong className={css.targetAmount}>{money(target)}</strong>
          <p className={css.targetSub}>{targetMultiplierNote(input)}</p>
        </div>
      </section>

      <section className={css.binderCard}>
        <div className={css.binderCardHead}>
          <h3>Alokasi Dana Darurat</h3>
          <span className={css.binderCardNote}>50% likuid : 50% bertumbuh</span>
        </div>
        <div
          className={css.allocBar}
          role="img"
          aria-label={`Alokasi 50% Tabungan Likuid (${money(target * 0.5)}) dan 50% Instrumen investasi (${money(target * 0.5)})`}
        >
          <span className={css.allocLiquid}>50%</span>
          <span className={css.allocInvest}>50%</span>
        </div>
        <div className={css.legendGrid}>
          <div className={css.legendItem}>
            <span>50% Tabungan Likuid</span>
            <strong>{money(target * 0.5)}</strong>
          </div>
          <div className={css.legendItem + " " + css.legendItemRight}>
            <span>50% Instrumen investasi</span>
            <strong>{money(target * 0.5)}</strong>
          </div>
        </div>
        <small>Prioritaskan dana yang cepat cair dan berisiko rendah.</small>
      </section>

      <section className={css.binderCard}>
        <div className={css.binderCardHead}>
          <h3>Strategimu</h3>
          <span className={css.binderCardNote}>rincian parameter saat ini</span>
        </div>
        <div className={css.paramList}>
          <div className={css.paramRow}>
            <div className={css.paramMain}>
              <div className={css.paramIcon}>
                <MetricIcon kind="initial" />
              </div>
              <div>
                <p className={css.paramLabel}>Dana darurat saat ini</p>
                <p className={css.paramValue}>{money(num(input.initial))}</p>
              </div>
            </div>
          </div>

          <div className={css.paramRow}>
            <div className={css.paramMain}>
              <div className={css.paramIcon}>
                <MetricIcon kind="payment" />
              </div>
              <div>
                <p className={css.paramLabel}>Investasi per bulan</p>
                <p className={css.paramValue}>{money(num(input.payment))}</p>
                <p className={css.paramSub}>Asumsi setoran di awal bulan.</p>
              </div>
            </div>
          </div>

          <div className={css.paramRow}>
            <div className={css.paramMain}>
              <div className={css.paramIcon}>
                <MetricIcon kind="rate" />
              </div>
              <div>
                <p className={css.paramLabel}>Return asumsi</p>
                <p className={css.paramValue}>{percent(num(input.rate))}/tahun</p>
              </div>
            </div>
          </div>

          <div className={css.paramRow}>
            <div className={css.paramMain}>
              <div className={css.paramIcon}>
                <MetricIcon kind="duration" />
              </div>
              <div>
                <p className={css.paramLabel}>Lama investasi</p>
                <p className={css.paramValue}>{monthText(months)}</p>
              </div>
            </div>
          </div>

          <div className={css.paramRow}>
            <div className={css.paramMain}>
              <div
                className={
                  css.paramIcon + (gap === 0 ? " " + css.paramIconSuccess : "")
                }
              >
                <MetricIcon kind="result" />
              </div>
              <div>
                <p className={css.paramLabel}>Hasil proyeksi investasi</p>
                <p className={css.paramValue}>{money(projected)}</p>
                <p
                  className={
                    css.paramSub + (gap > 0 ? " " + css.paramSubError : "")
                  }
                >
                  {gap > 0
                    ? `Kekurangan: ${money(gap)} dari target`
                    : projected > target
                      ? `Kelebihan: ${money(projected - target)} di atas target`
                      : "Pas mencapai target"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <BreakdownSection result={result} />

      <InstrumentsCard />

      <details className={css.binderCard}>
        <summary className={css.timelineSummary}>Timeline Proyeksi Tahunan</summary>
        <div className={css.tableScroll} tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th scope="col">Tahun</th>
                <th scope="col">Nilai investasi</th>
              </tr>
            </thead>
            <tbody>
              {timeline.map((row) => (
                <tr key={num(row.year)}>
                  <td>{num(row.year)}</td>
                  <td>{money(num(row.value))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}

function RecommendationTab({
  result,
  input,
  initialSegment,
}: {
  result: Result;
  input: Result;
  initialSegment?: Segment;
}) {
  const [option, setOption] = useState<"payment" | "duration">(
    initialSegment === "duration" ? "duration" : "payment",
  );
  const id = useId();
  const rec = result.recommendations as Result;
  const target = num(result.target);
  const span = recDuration(rec);
  const origMonths = Math.round(num(input.years) * 12);

  if (result.strategy_state === "success") {
    return (
      <div className={css.statusBanner} data-status="success">
        <div className={css.statusCopy}>
          <strong className={css.statusTitle}>
            <StatusIcon state="success" />
            Strategimu sudah memenuhi target
          </strong>
          <p>Kamu bisa mempertahankan rencana setoran dan durasi ini.</p>
        </div>
        <span className={css.statusSeal}>SUDAH COCOK</span>
      </div>
    );
  }

  const isDuration = option === "duration";
  const newPayment = num(rec.payment);
  const newProjection = num(isDuration ? rec.years_value : rec.payment_value);
  const targetMonths = isDuration ? (span?.value ?? 0) : origMonths;
  const hasTimeline = targetMonths > 0 && newProjection > 0;

  return (
    <>
      <fieldset className={css.segmentFieldset}>
        <legend>Pilih tipe rekomendasi</legend>
        <div className={css.segmentTray}>
          <label className={css.segmentLabel}>
            <input
              className={css.srOnly}
              type="radio"
              name={id}
              value="payment"
              checked={!isDuration}
              onChange={() => setOption("payment")}
            />
            <span className={css.segmentFace}>
              <span>Nominal</span>
              {!isDuration && <span className={css.segmentChip}>Fokus Bulanan</span>}
            </span>
          </label>
          <label className={css.segmentLabel}>
            <input
              className={css.srOnly}
              type="radio"
              name={id}
              value="duration"
              checked={isDuration}
              onChange={() => setOption("duration")}
            />
            <span className={css.segmentFace}>
              <span>Durasi</span>
              {isDuration && <span className={css.segmentChip}>Fokus Durasi</span>}
            </span>
          </label>
        </div>
      </fieldset>

      <section className={css.targetBanner}>
        <div className={css.targetLeft}>
          <div className={css.targetIconBox}>
            <TargetIcon />
          </div>
          <div>
            <p className={css.targetEyebrow}>Target Akumulasi Pokok</p>
            <h3 className={css.targetTitle}>Total dana darurat yang kamu butuhkan</h3>
          </div>
        </div>
        <div className={css.targetRight}>
          <strong className={css.targetAmount}>{money(target)}</strong>
          <p className={css.targetSub}>{targetMultiplierNote(input)}</p>
        </div>
      </section>

      {isDuration && !span ? (
        <section className={css.binderCard}>
          <div className={css.binderCardHead}>
            <h3>Target belum tercapai dalam batas simulasi</h3>
          </div>
          <p className={css.paramSub}>
            Dengan setoran saat ini, target belum tercapai dalam batas simulasi 1.200 bulan. Pilih
            Nominal untuk melihat setoran bulanan yang perlu disiapkan.
          </p>
          <div>
            <button
              type="button"
              className={css.btnSheetPrimary}
              onClick={() => setOption("payment")}
            >
              Lihat rekomendasi Nominal →
            </button>
          </div>
        </section>
      ) : (
        <>
          <section className={css.binderCard}>
            <div className={css.binderCardHead}>
              <h3>Rincian Parameter Rekomendasi</h3>
              <span className={css.binderCardNote}>
                {isDuration ? "penyesuaian durasi waktu" : "penyesuaian setoran bulanan"}
              </span>
            </div>

            <div className={css.paramList}>
              <div className={css.paramRow}>
                <div className={css.paramMain}>
                  <div className={css.paramIcon}>
                    <MetricIcon kind="initial" />
                  </div>
                  <div>
                    <p className={css.paramLabel}>Dana darurat saat ini</p>
                    <p className={css.paramValue}>{money(num(input.initial))}</p>
                  </div>
                </div>
                <span className={css.paramBadge}>Saldo Awal</span>
              </div>

              <div className={css.paramRow}>
                <div className={css.paramMain}>
                  <div className={css.paramIcon}>
                    <MetricIcon kind="payment" />
                  </div>
                  <div>
                    <p className={css.paramLabel}>Investasi per bulan</p>
                    {!isDuration ? (
                      <>
                        <div className={css.diffRow} aria-hidden="true">
                          <span className={css.strikeOld}>
                            {money(num(input.payment))}/bulan
                          </span>
                          <span>▸</span>
                          <strong className={css.highlightYellow}>
                            {money(newPayment)}/bulan
                          </strong>
                        </div>
                        <span className={css.srOnly}>
                          Dari {money(num(input.payment))} per bulan menjadi{" "}
                          {money(newPayment)} per bulan.
                        </span>
                      </>
                    ) : (
                      <p className={css.paramValue}>{money(num(input.payment))}/bulan</p>
                    )}
                  </div>
                </div>
                <span className={css.paramBadge}>
                  {!isDuration ? "Setoran Baru" : "Tetap Terjangkau"}
                </span>
              </div>

              <div className={css.paramRow}>
                <div className={css.paramMain}>
                  <div className={css.paramIcon}>
                    <MetricIcon kind="rate" />
                  </div>
                  <div>
                    <p className={css.paramLabel}>Return asumsi</p>
                    <p className={css.paramValue}>{percent(num(input.rate))}/tahun</p>
                  </div>
                </div>
              </div>

              <div className={css.paramRow}>
                <div className={css.paramMain}>
                  <div className={css.paramIcon}>
                    <MetricIcon kind="duration" />
                  </div>
                  <div>
                    <p className={css.paramLabel}>Lama investasi</p>
                    {isDuration && span ? (
                      <>
                        <div className={css.diffRow} aria-hidden="true">
                          <span className={css.strikeOld}>{monthText(origMonths)}</span>
                          <span>▸</span>
                          <strong className={css.highlightYellow}>{span.text}</strong>
                        </div>
                        <span className={css.srOnly}>
                          Dari {monthText(origMonths)} menjadi {span.text}.
                        </span>
                      </>
                    ) : (
                      <p className={css.paramValue}>{monthText(origMonths)}</p>
                    )}
                  </div>
                </div>
                <span className={css.paramBadge}>
                  {isDuration ? "Penyesuaian Durasi" : "Durasi Awal"}
                </span>
              </div>

              <div className={css.paramRow}>
                <div className={css.paramMain}>
                  <div className={css.paramIcon + " " + css.paramIconSuccess}>
                    <MetricIcon kind="result" />
                  </div>
                  <div>
                    <p className={css.paramLabel}>Proyeksi baru</p>
                    <p className={css.paramValue}>
                      <strong className={css.highlightGreen}>{money(newProjection)}</strong>
                    </p>
                    {newProjection >= target && (
                      <p className={css.paramSub}>✓ Memenuhi target</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <BreakdownSection
            result={rec}
            prefix={isDuration ? "duration" : "payment"}
          />

          <InstrumentsCard />

          {hasTimeline && (
            <section className={css.binderCard}>
              <div className={css.binderCardHead}>
                <h3>Timeline Rekomendasi</h3>
                <span className={css.paramBadge}>
                  {monthText(targetMonths)}
                </span>
              </div>
              <div className={css.verticalTimeline}>
                <div className={css.timelineNode}>
                  <span className={css.timelineMeta}>Bulan 1 · Awal rencana</span>
                  <p className={css.timelineLabel}>Dana darurat saat ini</p>
                  <span className={css.timelineAmount}>{money(num(input.initial))}</span>
                </div>
                <div className={css.timelineNode + " " + css.timelineNodeFinish}>
                  <span className={css.timelineMeta}>
                    Bulan {targetMonths.toLocaleString("id-ID")} · Akhir simulasi
                  </span>
                  <p className={css.timelineLabel}>Proyeksi investasi rekomendasi</p>
                  <span
                    className={css.timelineAmount + " " + css.timelineAmountFinish}
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

const exportFormats = [
  {
    name: "Feeds",
    ratio: "1:1",
    size: "1024×1024",
    portrait: false,
    channels: ["Twitter / X", "IG Post", "FB Post"],
  },
  {
    name: "Stories",
    ratio: "9:16",
    size: "1080×1920",
    portrait: true,
    channels: ["IG Story", "WA Status", "FB Story"],
  },
] as const;

function DownloadTab({ result }: { result: Result }) {
  const [name, setName] = useState("");
  const [exportTheme, setExportTheme] = useState<"light" | "dark">("light");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const target = num(result.target);
  const principalShare = Math.max(0, Math.min(100, num(result.principal_percent)));
  const interestShare = Math.max(0, Math.min(100 - principalShare, num(result.interest_percent)));
  const previewName = name.trim() || "Rencana Dana Darurat";

  async function save(portrait: boolean) {
    setBusy(true);
    setStatus("Menyiapkan gambar…");
    try {
      await downloadPng(
        { ...result, dream_name: name.trim() },
        "Dana Darurat",
        "dana-darurat",
        portrait,
        exportTheme,
        "Rencana Dana Darurat",
      );
      setStatus("Unduhan PNG dimulai.");
    } catch {
      setStatus("Unduhan belum berhasil. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className={css.infoNotice}>
        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a1 1 0 0 0 0 2v3a1 1 0 0 0 1 1h1a1 1 0 1 0 0-2v-3a1 1 0 0 0-1-1H9Z"
            clipRule="evenodd"
          />
        </svg>
        <div>
          <h3>Download gambar</h3>
          <p>
            Kamu bisa mengunduh ringkasan strategi dana darurat sebagai gambar PNG lokal untuk
            catatan pribadimu atau dibagikan.
          </p>
        </div>
      </section>

      <section className={css.binderCard}>
        <div>
          <label htmlFor="emergency-export-name">Nama kamu (opsional)</label>
          <input
            id="emergency-export-name"
            className={css.exportNameInput}
            value={name}
            maxLength={80}
            placeholder="Tuliskan nama atau inisialmu..."
            aria-describedby="emergency-export-privacy"
            onChange={(event) => setName(event.target.value)}
          />
          <p id="emergency-export-privacy" className={css.paramSub}>
            Nama hanya dipakai di gambar unduhan dan tetap di perangkatmu.
          </p>
        </div>

        <div>
          <p className={css.paramLabel}>Varian gambar</p>
          <div className={css.exportThemeRow} role="group" aria-label="Varian gambar">
            {(["light", "dark"] as const).map((variant) => (
              <button
                key={variant}
                type="button"
                className={css.exportThemeBtn}
                aria-pressed={exportTheme === variant}
                onClick={() => setExportTheme(variant)}
              >
                {variant === "light" ? "Light" : "Dark"}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section aria-label="Pilih ukuran gambar">
        <div className={css.binderCardHead}>
          <h3>Pilih ukuran gambar</h3>
          <span className={css.binderCardNote}>PNG resolusi tinggi · {exportTheme === "light" ? "Light" : "Dark"}</span>
        </div>

        <div className={css.exportCards} aria-busy={busy}>
          {exportFormats.map((fmt) => (
            <article className={css.exportCard} key={fmt.name}>
              <div className={css.previewStage}>
                <div
                  className={
                    css.miniCard +
                    " " +
                    (fmt.portrait ? css.miniStory : css.miniSquare)
                  }
                  data-preview-theme={exportTheme}
                >
                  <div className={css.miniHead}>
                    <span className={css.miniLogo} aria-hidden="true">
                      A
                    </span>
                    <span>Dana Darurat</span>
                  </div>
                  <div>
                    <div className={css.miniTitle}>Target Dana</div>
                    <div className={css.miniAmount}>{money(target)}</div>
                  </div>
                  <svg
                    className={css.miniSvg}
                    viewBox="0 0 100 8"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <rect className={css.barPokok} x="0" y="0" width={principalShare} height="8" />
                    <rect
                      className={css.barBunga}
                      x={principalShare}
                      y="0"
                      width={interestShare}
                      height="8"
                    />
                  </svg>
                  <div className={css.miniFoot}>
                    <span className={css.miniName}>{previewName}</span>
                    <span>Arda</span>
                  </div>
                </div>
              </div>

              <div className={css.exportMeta}>
                <h4>
                  {fmt.name} ({fmt.ratio})
                </h4>
                <p>{fmt.size} piksel</p>
                <div className={css.tagRow}>
                  {fmt.channels.map((channel) => (
                    <span key={channel}>{channel}</span>
                  ))}
                </div>
              </div>

              <button
                type="button"
                className={css.downloadBtn}
                disabled={busy}
                aria-label={`Download ${fmt.name} ${exportTheme === "light" ? "Light" : "Dark"}`}
                onClick={() => void save(fmt.portrait)}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1m-4-4-4 4m0 0-4-4m4 4V4" />
                </svg>
                <span>Download {fmt.name}</span>
              </button>
            </article>
          ))}
        </div>
      </section>

      <p role="status" className={css.statusText}>
        {status}
      </p>
    </>
  );
}

export function EmergencyResults({
  result,
  input,
  tab,
  initialSegment,
}: {
  result: Result;
  input: Result;
  tab: number;
  initialSegment?: Segment;
  onSwitchToRecommendation?: () => void;
}) {
  if (tab === 0) return <StrategyTab result={result} input={input} />;
  if (tab === 1)
    return (
      <RecommendationTab
        result={result}
        input={input}
        initialSegment={initialSegment}
      />
    );
  return <DownloadTab result={result} />;
}
