import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { post } from "../api";
import { money, percent } from "../config";
import type { Result } from "../../domain/calculators/types";
import {
  answerError,
  emptyAnswersFor,
  furthestStep,
  parseRupiah,
  type Answers,
  type Question,
} from "../conversational/answers";
import { getSpec } from "../conversational/specs";
import { PillOptions, UnitInput } from "./controls";
import { ResultSheet } from "./ResultSheet";
import { EmergencyResults } from "./Results";
import { computeEmergencySummary } from "./summary";
import css from "./emergency-binder.module.css";

function Paperclip() {
  return (
    <svg
      className={css.paperclip}
      viewBox="0 0 24 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 12v22a6 6 0 0 0 12 0V9a4 4 0 0 0-8 0v24a2 2 0 0 0 4 0V14" />
    </svg>
  );
}

function GuideAvatarIcon() {
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
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <path d="M8 7h8M8 11h5" />
    </svg>
  );
}

function HelpPopover({ question }: { question: Question }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const popId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (wrap.current && !wrap.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
        button.current?.focus();
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className={css.helpWrap} ref={wrap}>
      <button
        ref={button}
        type="button"
        className={css.helpBtn}
        aria-expanded={open}
        aria-controls={popId}
        aria-label={"Informasi: " + question.label}
        onClick={() => setOpen((prev) => !prev)}
      >
        ?
      </button>
      {open && (
        <div
          id={popId}
          role="region"
          aria-label={"Penjelasan " + question.label}
          className={css.helpPopover}
        >
          <div className={css.helpPopoverHead}>
            <strong>Penjelasan</strong>
            <button
              type="button"
              className={css.helpCloseBtn}
              aria-label="Tutup penjelasan"
              onClick={() => {
                setOpen(false);
                button.current?.focus();
              }}
            >
              ✕
            </button>
          </div>
          <p>{question.help}</p>
        </div>
      )}
    </div>
  );
}

function durationNote(monthsRaw: string): string {
  const months = Number(monthsRaw);
  if (!Number.isInteger(months) || months < 1 || months > 1200) return "";
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years === 0) return `Setara dengan ${months} bulan`;
  if (rem === 0) return `Setara dengan ${years} tahun penuh`;
  return `Setara dengan ${years} tahun ${rem} bulan`;
}

const tabMeta = [
  {
    title: "Evaluasi Strategi Dana Darurat",
    subtitle: "Tinjauan rencana, alokasi, & proyeksi pencapaian target",
  },
  {
    title: "Rekomendasi Dana Darurat",
    subtitle: "Penyesuaian setoran atau durasi agar target tercapai",
  },
  {
    title: "Download Hasil Rencana",
    subtitle: "Simpan lembar ringkasan dana darurat sebagai gambar PNG lokal",
  },
] as const;

export function Emergency() {
  const spec = getSpec("dana-darurat");
  const questions = spec.questions;
  const [answers, setAnswers] = useState<Answers>(() => emptyAnswersFor(questions));
  const [maxStepReached, setMaxStepReached] = useState(0);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [snapshot, setSnapshot] = useState<{ result: Result; payload: Result }>();
  const [submission, setSubmission] = useState(0);
  const [tab, setTab] = useState(0);
  const sheet = useRef<HTMLDialogElement>(null);
  const cta = useRef<HTMLButtonElement>(null);

  const errors = questions.map((question) =>
    answerError(question, answers[question.key] ?? "", answers),
  );
  const firstInvalid = errors.findIndex(Boolean);
  const summary = computeEmergencySummary(answers);

  function update(key: string, value: string) {
    const next = { ...answers, [key]: value };
    setAnswers(next);
    setTouched((previous) => ({ ...previous, [key]: true }));
    setMaxStepReached((previous) => furthestStep(questions, next, previous));
    setMessage("");
  }

  async function runCalculation(formEl?: HTMLFormElement | null) {
    if (busy) return;
    if (firstInvalid >= 0) {
      const key = questions[firstInvalid].key;
      setTouched((previous) => ({ ...previous, [key]: true }));
      formEl?.querySelector<HTMLInputElement>(`[name="${key}"]`)?.focus();
      return;
    }
    const payload = spec.toPayload(answers);
    setBusy(true);
    setMessage("");
    try {
      const result: Result = await post("/api/calculate/dana-darurat", payload);
      setSnapshot({ result, payload });
      setTab(0);
      setSubmission((count) => count + 1);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Perhitungan belum berhasil. Periksa koneksi lalu coba lagi.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runCalculation(event.currentTarget);
  }

  const activeMeta = tabMeta[tab] ?? tabMeta[0];
  const needsRecommendation =
    snapshot && snapshot.result.strategy_state !== "success";

  return (
    <div className={css.workspaceGrid}>
      <section className={css.formCol} aria-labelledby="dd-heading">
        <a href="/" className={css.backLink}>
          ← Beranda
        </a>
        <div className={css.pageIntro}>
          <p className={css.eyebrow}>KALKULATOR · DANA DARURAT</p>
          <h1 id="dd-heading" className={css.title}>
            {spec.title}
          </h1>
          <p className={css.lead}>
            Jawab satu pertanyaan pada satu waktu. Pertanyaan berikutnya akan muncul setelah kamu
            mengisi jawaban tanpa perlu terburu-buru.
          </p>
        </div>

        <div className={css.mindsetCard}>
          <Paperclip />
          <p className={css.mindsetLabel}>Catatan Pelan-Pelan · Pegangan Diri</p>
          <blockquote className={css.mindsetQuote}>{spec.quote}</blockquote>
          <p className={css.mindsetAuthor}>— Pengingat Arda</p>
        </div>

        <div className={css.bubbleRow}>
          <div className={css.avatarBadge}>
            <GuideAvatarIcon />
          </div>
          <p className={css.bubble}>{spec.intro}</p>
        </div>

        <form onSubmit={submit} noValidate aria-busy={busy}>
          <ol className={css.rail} aria-label={"Langkah rencana " + spec.title}>
            {questions.map((question, index) => {
              const visible = index <= maxStepReached;
              const state = !visible ? "upcoming" : errors[index] ? "active" : "completed";
              const error = touched[question.key] && errors[index];
              const id = "emergency-" + question.key;
              const monthsNote =
                question.key === "months" && !errors[index]
                  ? durationNote(answers.months ?? "")
                  : "";

              return (
                <li
                  key={question.key}
                  className={css.railItem}
                  data-state={state}
                  hidden={!visible}
                >
                  {index === spec.phase2At && (
                    <div className={css.transitionWrap}>
                      <div className={css.bubbleRow}>
                        <div className={css.avatarBadge}>
                          <GuideAvatarIcon />
                        </div>
                        <div className={css.bubbleStack}>
                          <span className={css.bubbleTag}>Tahap Strategi</span>
                          <p className={css.bubble}>{spec.transition}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <span className={css.srOnly}>
                    {state === "completed"
                      ? "Selesai."
                      : state === "active"
                        ? "Belum lengkap."
                        : "Belum dibuka."}
                  </span>

                  <div className={css.stepCard}>
                    <fieldset className={css.stepFieldset}>
                      <div className={css.stepHeader}>
                        <legend className={css.stepLegend}>
                          {question.options ? (
                            question.label
                          ) : (
                            <label htmlFor={id}>{question.label}</label>
                          )}
                        </legend>
                        <HelpPopover question={question} />
                      </div>

                      {question.options ? (
                        <PillOptions
                          name={question.key}
                          value={answers[question.key] ?? ""}
                          options={question.options}
                          invalid={!!error}
                          describedBy={error ? id + "-error" : undefined}
                          onValue={(value) => update(question.key, value)}
                        />
                      ) : (
                        <UnitInput
                          id={id}
                          name={question.key}
                          unit={question.unit}
                          value={answers[question.key] ?? ""}
                          inputMode={question.unit.includes("%") ? "decimal" : "numeric"}
                          aria-invalid={error ? true : undefined}
                          aria-describedby={error ? id + "-error" : undefined}
                          onValue={(value) => update(question.key, value)}
                        />
                      )}

                      {question.key === "expense" && answers.expense && !errors[0] && (
                        <div className={css.annualExpense}>
                          <span id="annual-expense-label">Pengeluaran wajib per tahun</span>
                          <output htmlFor={id} aria-labelledby="annual-expense-label">
                            {money(parseRupiah(answers.expense) * 12)}
                          </output>
                          <small>Pengeluaran per bulan × 12 bulan</small>
                        </div>
                      )}

                      {monthsNote && <small className={css.fieldNote}>{monthsNote}</small>}

                      {error && (
                        <p className={css.errorText} id={id + "-error"} role="alert">
                          {error}
                        </p>
                      )}
                    </fieldset>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className={css.ctaBanner} hidden={firstInvalid !== -1}>
            <div>
              <p className={css.ctaNote}>Semua langkah sudah terisi lengkap.</p>
              <h2 className={css.ctaHeading}>Ayo lihat hasil strategimu</h2>
            </div>
            <button
              type="submit"
              className={css.btnForest}
              ref={cta}
              disabled={busy}
              aria-busy={busy}
            >
              <span>{busy ? "Menghitung…" : "Buka Lembar Strategi"}</span>
              <span className={css.btnArrow} aria-hidden="true">
                →
              </span>
            </button>
          </div>

          {message && (
            <div role="alert" className={css.apiErrorBox}>
              <p>{message}</p>
              <button
                type="button"
                className={css.retryBtn}
                disabled={busy}
                onClick={() => void runCalculation(null)}
              >
                Coba Hitung Ulang
              </button>
            </div>
          )}
        </form>
      </section>

      <aside className={css.sidebarCol} aria-label="Panduan dan ringkasan Dana Darurat">
        <div className={css.guideSticky + " " + css.washiTop}>
          <div className={css.guideHeader}>
            <h2>Begini alurnya</h2>
            <span className={css.guideBadge}>ALUR KERJA</span>
          </div>
          <p className={css.guideLead}>
            Kalkulator ini mengikuti ceritamu. Isi angka yang kamu tahu dulu; kamu bisa kembali
            mengubahnya kapan saja saat kondisimu berubah.
          </p>
          <ol className={css.guideSteps}>
            <li>
              <span className={css.guideNum} aria-hidden="true">
                1
              </span>
              <div>
                <h3>Tentukan tujuan</h3>
                <p>Hitung pengeluaran wajib per bulan, status pernikahan, dan tanggungan.</p>
              </div>
            </li>
            <li>
              <span className={css.guideNum} aria-hidden="true">
                2
              </span>
              <div>
                <h3>Isi rencanamu</h3>
                <p>Sesuaikan durasi, dana saat ini, setoran bulanan, dan asumsi return.</p>
              </div>
            </li>
            <li>
              <span className={css.guideNum} aria-hidden="true">
                3
              </span>
              <div>
                <h3>Lihat hasilnya</h3>
                <p>Tinjau strategi, opsi rekomendasi, dan unduh lembar PNG bila perlu.</p>
              </div>
            </li>
          </ol>
          <p className={css.guideQuote}>
            “Belum punya angka pasti? Mulai dari perkiraan yang masuk akal.”
          </p>
        </div>

        <section className={css.summaryCard} aria-label="Ringkasan target sementara">
          <div className={css.summaryHead}>
            <h2>Ringkasan Target</h2>
            <span className={css.summaryTag}>LIVE ARDA</span>
          </div>
          {!summary ? (
            <p className={css.summaryEmpty}>
              Isi pengeluaran wajib bulanan, status menikah, dan jumlah tanggungan untuk melihat
              target dana darurat serta alokasi 50/50.
            </p>
          ) : (
            <>
              <div>
                <p className={css.summaryTargetLabel}>Target dana darurat dibutuhkan</p>
                <p className={css.summaryTargetValue}>{money(summary.target)}</p>
                <p className={css.summaryMultiplier}>
                  {summary.multiplier}× pengeluaran wajib ({summary.married ? "Sudah menikah" : "Belum menikah"}
                  , {summary.dependents} tanggungan)
                </p>
              </div>

              {summary.hasCurrent ? (
                <div className={css.progressBlock}>
                  <svg
                    viewBox="0 0 100 8"
                    preserveAspectRatio="none"
                    className={css.progressSvg}
                    role="img"
                    aria-label={`Progres dana saat ini ${percent(summary.progressPercent)} dari target`}
                  >
                    <rect
                      x="0"
                      y="0"
                      width={summary.progressPercent}
                      height="8"
                      className={css.progressFill}
                    />
                  </svg>
                  <div className={css.summaryStatRow}>
                    <span>Saldo saat ini ({percent(summary.progressPercent)})</span>
                    <strong>{money(summary.current ?? 0)}</strong>
                  </div>
                  <div className={css.summaryStatRow}>
                    <span>
                      {(summary.shortfall ?? 0) > 0
                        ? "Kekurangan dari saldo saat ini"
                        : "Status saldo saat ini"}
                    </span>
                    <strong>
                      {(summary.shortfall ?? 0) > 0
                        ? money(summary.shortfall ?? 0)
                        : "Sudah memenuhi target"}
                    </strong>
                  </div>
                </div>
              ) : (
                <p className={css.summaryEmpty}>
                  Isi dana darurat saat ini pada langkah ke-5 untuk melihat selisih terhadap saldo
                  saat ini.
                </p>
              )}

              <div className={css.allocSummaryGrid}>
                <div className={css.allocSummaryBox}>
                  <span>50% Tabungan Likuid</span>
                  <strong>{money(summary.liquidAllocation)}</strong>
                </div>
                <div className={css.allocSummaryBox}>
                  <span>50% Instrumen investasi</span>
                  <strong>{money(summary.investAllocation)}</strong>
                </div>
              </div>
            </>
          )}
        </section>
      </aside>

      {snapshot && (
        <ResultSheet
          key={submission}
          dialog={sheet}
          returnFocus={cta}
          activeTab={tab}
          onTabChange={setTab}
          onClose={() => cta.current?.focus()}
          title={activeMeta.title}
          subtitle={activeMeta.subtitle}
          action={
            tab === 0 && needsRecommendation
              ? {
                  label: "Buka Rekomendasi Solusi →",
                  onClick: () => setTab(1),
                }
              : undefined
          }
          tabs={["Strategi", "Rekomendasi", "Download"]}
        >
          {(panelIndex) => (
            <EmergencyResults
              result={snapshot.result}
              input={snapshot.payload}
              tab={panelIndex}
              onSwitchToRecommendation={() => setTab(1)}
            />
          )}
        </ResultSheet>
      )}
    </div>
  );
}
