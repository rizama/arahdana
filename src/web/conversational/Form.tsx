import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { post } from "../api";
import { calculators, money, percent } from "../config";
import type { CalculatorSlug, Result } from "../../domain/calculators/types";
import { answerError, emptyAnswersFor, furthestStep, type Answers, type Question } from "./answers";
import { PillOptions, UnitInput } from "./controls";
import { ResultSheet } from "./ResultSheet";
import { ConversationalResults } from "./Results";
import { getSpec } from "./specs";
import { computeCalculatorSummary, guideStepsFor } from "./summary";
import binderCss from "../emergency/emergency-binder.module.css";
import css from "./conversational.module.css";

function Paperclip() {
  return (
    <svg
      className={binderCss.paperclip}
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
    <div className={binderCss.helpWrap} ref={wrap}>
      <button
        ref={button}
        type="button"
        className={binderCss.helpBtn}
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
          className={binderCss.helpPopover}
        >
          <div className={binderCss.helpPopoverHead}>
            <strong>Penjelasan</strong>
            <button
              type="button"
              className={binderCss.helpCloseBtn}
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

function sheetMetadata(slug: CalculatorSlug, title: string, tab: number) {
  if (slug === "simulasi-kpr") {
    return (
      [
        {
          title: "Evaluasi Simulasi KPR",
          subtitle: "Ringkasan pinjaman, kelayakan cicilan & jadwal bulanan",
        },
        {
          title: "Rincian Bunga & Biaya",
          subtitle: "Estimasi bunga fix/floating serta 7 komponen biaya transaksi",
        },
        {
          title: "Download Hasil Simulasi",
          subtitle: "Simpan lembar ringkasan simulasi KPR sebagai gambar PNG lokal",
        },
      ][tab] ?? {
        title: "Evaluasi Simulasi KPR",
        subtitle: "Ringkasan pinjaman, kelayakan cicilan & jadwal bulanan",
      }
    );
  }
  return (
    [
      {
        title: "Evaluasi Strategi " + title,
        subtitle: "Tinjauan rencana, proyeksi, & pencapaian target",
      },
      {
        title: "Rekomendasi " + title,
        subtitle: "Penyesuaian setoran, durasi, atau asumsi return",
      },
      {
        title: "Download Hasil Rencana",
        subtitle: `Simpan lembar ringkasan ${title.toLowerCase()} sebagai gambar PNG lokal`,
      },
    ][tab] ?? {
      title: "Evaluasi Strategi " + title,
      subtitle: "Tinjauan rencana, proyeksi, & pencapaian target",
    }
  );
}

function focusInvalidTarget(formEl: HTMLFormElement | null, key: string) {
  if (!formEl) return;
  const direct = formEl.querySelector<HTMLElement>(`[name="${key}"]`);
  if (direct) {
    direct.focus();
    return;
  }
  if (key === "wedding_budget") {
    formEl.querySelector<HTMLElement>('[name="budget"], [name="venue"]')?.focus();
    return;
  }
  if (key === "education_levels") {
    formEl
      .querySelector<HTMLElement>(
        '[name="level-sd"], [name="level-smp"], [name="level-sma"], [name="level-s1"]',
      )
      ?.focus();
  }
}

export function ConversationalForm({ slug }: { slug: CalculatorSlug }) {
  const spec = getSpec(slug);
  const questions = spec.questions;
  const startingAnswers = (): Answers => {
    const base = emptyAnswersFor(questions);
    const overrides = spec.initialAnswers?.() ?? {};
    for (const [key, value] of Object.entries(overrides)) {
      if (typeof value === "string") base[key] = value;
    }
    return base;
  };

  const [answers, setAnswers] = useState<Answers>(startingAnswers);
  const [extra, setExtra] = useState<Record<string, unknown>>(
    () => spec.initialExtraState?.() ?? {},
  );
  const [maxStepReached, setMaxStepReached] = useState(() =>
    furthestStep(questions, startingAnswers(), 0),
  );
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [snapshot, setSnapshot] = useState<{ result: Result; payload: Result }>();
  const [submission, setSubmission] = useState(0);
  const [tab, setTab] = useState(0);

  const formRef = useRef<HTMLFormElement>(null);
  const sheet = useRef<HTMLDialogElement>(null);
  const cta = useRef<HTMLButtonElement>(null);

  const extraErrors = spec.extraError?.(answers, extra) ?? {};
  const errors = questions.map(
    (question) =>
      answerError(question, answers[question.key] ?? "", answers) ||
      extraErrors[question.key] ||
      "",
  );
  const firstInvalid = errors.findIndex(Boolean);
  const guide = guideStepsFor(slug);
  const summary = computeCalculatorSummary(slug, answers, extra);

  function update(key: string, value: string) {
    const next = { ...answers, [key]: value };
    const nextExtra = spec.onAnswerChange?.(key, value, next, extra) ?? extra;
    setAnswers(next);
    setExtra(nextExtra);
    setTouched((previous) => ({
      ...previous,
      [key]: true,
      ...(slug === "menikah" ? { wedding_budget: true } : {}),
      ...(slug === "pendidikan-anak" && key === "child_age"
        ? { education_levels: true }
        : {}),
    }));
    setMaxStepReached((previous) => furthestStep(questions, next, previous));
    setMessage("");
  }

  function updateExtra(nextExtra: Record<string, unknown>) {
    setExtra(nextExtra);
    if (slug === "pendidikan-anak") {
      setTouched((previous) => ({ ...previous, education_levels: true }));
    }
    setMessage("");
  }

  const view = { answers, extra, update, setExtra: updateExtra };

  async function runCalculation(formEl?: HTMLFormElement | null) {
    if (busy) return;
    if (firstInvalid >= 0) {
      const key = questions[firstInvalid].key;
      setTouched((previous) => ({ ...previous, [key]: true }));
      focusInvalidTarget(formEl ?? formRef.current, key);
      return;
    }
    const payload = spec.toPayload(answers, extra);
    setBusy(true);
    setMessage("");
    try {
      const result: Result = await post("/api/calculate/" + slug, payload);
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

  const activeMeta = sheetMetadata(slug, spec.title, tab);
  const isKpr = slug === "simulasi-kpr";
  const needsRecommendation =
    !isKpr && Boolean(snapshot && snapshot.result.strategy_state !== "success");
  const kprAffordability =
    isKpr && snapshot?.result.affordability && !Array.isArray(snapshot.result.affordability)
      ? (snapshot.result.affordability as Result)
      : null;
  const kprDanger =
    isKpr &&
    tab === 0 &&
    (kprAffordability?.status === "tidak_sehat" ||
      kprAffordability?.status === "berbahaya");
  const sheetTone = (tab === 0 && needsRecommendation) || kprDanger ? "danger" : "success";

  const sheetAction =
    tab === 0 && needsRecommendation
      ? { label: "Buka Rekomendasi Solusi →", onClick: () => setTab(1) }
      : isKpr && tab === 0
        ? { label: "Lihat Biaya Transaksi →", onClick: () => setTab(1) }
        : undefined;

  return (
    <div className={binderCss.workspaceGrid}>
      <section className={binderCss.formCol} aria-labelledby={slug + "-heading"}>
        <a href="/" className={binderCss.backLink}>
          ← Beranda
        </a>
        <div className={binderCss.pageIntro}>
          <p className={binderCss.eyebrow}>KALKULATOR · {spec.title.toUpperCase()}</p>
          <h1 id={slug + "-heading"} className={binderCss.title}>
            {spec.title}
          </h1>
          <p className={binderCss.lead}>{calculators[slug].description}</p>
        </div>

        <div className={binderCss.mindsetCard}>
          <Paperclip />
          <p className={binderCss.mindsetLabel}>Catatan Pelan-Pelan · Pegangan Diri</p>
          <blockquote className={binderCss.mindsetQuote}>{spec.quote}</blockquote>
          <p className={binderCss.mindsetAuthor}>— Pengingat Arda</p>
        </div>

        <div className={binderCss.bubbleRow}>
          <div className={binderCss.avatarBadge}>
            <GuideAvatarIcon />
          </div>
          <p className={binderCss.bubble}>{spec.intro}</p>
        </div>

        <form ref={formRef} onSubmit={submit} noValidate aria-busy={busy}>
          <ol className={binderCss.rail} aria-label={"Langkah rencana " + spec.title}>
            {questions.map((question, index) => {
              const visible = index <= maxStepReached;
              const state = !visible
                ? "upcoming"
                : errors[index]
                  ? "active"
                  : "completed";
              const error = touched[question.key] && errors[index];
              const id = slug + "-" + question.key;
              const labelText = question.labelOf?.(answers) ?? question.label;
              const customView = spec.questionView?.(question.key, view);
              const note = !errors[index] ? question.noteOf?.(answers) ?? "" : "";

              return (
                <li
                  key={question.key}
                  className={binderCss.railItem}
                  data-state={state}
                  hidden={!visible}
                >
                  {index === spec.phase2At && spec.transition && (
                    <div className={binderCss.transitionWrap}>
                      <div className={binderCss.bubbleRow}>
                        <div className={binderCss.avatarBadge}>
                          <GuideAvatarIcon />
                        </div>
                        <div className={binderCss.bubbleStack}>
                          <span className={binderCss.bubbleTag}>Tahap Strategi</span>
                          <p className={binderCss.bubble}>{spec.transition}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <span className={binderCss.srOnly}>
                    {state === "completed"
                      ? "Selesai."
                      : state === "active"
                        ? "Belum lengkap."
                        : "Belum dibuka."}
                  </span>

                  <div className={binderCss.stepCard}>
                    <fieldset className={binderCss.stepFieldset}>
                      <div className={binderCss.stepHeader}>
                        <legend className={binderCss.stepLegend}>
                          {question.options || customView ? (
                            labelText
                          ) : (
                            <label htmlFor={id}>{labelText}</label>
                          )}
                        </legend>
                        <HelpPopover question={question} />
                      </div>

                      {customView ??
                        (question.options ? (
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
                            inputMode={
                              question.unit.includes("%") || question.integer === false
                                ? "decimal"
                                : "numeric"
                            }
                            aria-invalid={error ? true : undefined}
                            aria-describedby={error ? id + "-error" : undefined}
                            onValue={(value) => update(question.key, value)}
                          />
                        ))}

                      {spec.questionExtra?.(question.key, view)}

                      {note && <small className={binderCss.fieldNote}>{note}</small>}

                      {error && (
                        <p className={binderCss.errorText} id={id + "-error"} role="alert">
                          {error}
                        </p>
                      )}
                    </fieldset>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className={binderCss.ctaBanner} hidden={firstInvalid !== -1}>
            <div>
              <p className={binderCss.ctaNote}>Semua langkah sudah terisi lengkap.</p>
              <h2 className={binderCss.ctaHeading}>
                {isKpr ? "Simulasi KPR siap dihitung" : "Ayo lihat hasil strategimu"}
              </h2>
            </div>
            <button
              type="submit"
              className={binderCss.btnForest}
              ref={cta}
              disabled={busy}
              aria-busy={busy}
            >
              <span>
                {busy ? "Menghitung…" : spec.cta ?? "Buka Lembar Strategi"}
              </span>
              <span className={binderCss.btnArrow} aria-hidden="true">
                →
              </span>
            </button>
          </div>

          {message && (
            <div role="alert" className={binderCss.apiErrorBox}>
              <p>{message}</p>
              <button
                type="button"
                className={binderCss.retryBtn}
                disabled={busy}
                onClick={() => void runCalculation(formRef.current)}
              >
                Coba Hitung Ulang
              </button>
            </div>
          )}
        </form>
      </section>

      <aside
        className={binderCss.sidebarCol}
        aria-label={"Panduan dan ringkasan " + spec.title}
      >
        <div className={binderCss.guideSticky + " " + binderCss.washiTop}>
          <div className={binderCss.guideHeader}>
            <h2>Begini alurnya</h2>
            <span className={binderCss.guideBadge}>ALUR KERJA</span>
          </div>
          <p className={binderCss.guideLead}>{guide.lead}</p>
          <ol className={binderCss.guideSteps}>
            {guide.steps.map((step, i) => (
              <li key={step.title}>
                <span className={binderCss.guideNum} aria-hidden="true">
                  {i + 1}
                </span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className={binderCss.guideQuote}>
            “Belum punya angka pasti? Mulai dari perkiraan yang masuk akal.”
          </p>
        </div>

        <section
          className={binderCss.summaryCard}
          aria-label={"Ringkasan sementara " + spec.title}
        >
          <div className={binderCss.summaryHead}>
            <h2>
              {summary?.heading ?? (isKpr ? "Ringkasan Pinjaman" : "Ringkasan Target")}
            </h2>
            <span className={binderCss.summaryTag}>LIVE ARDA</span>
          </div>
          {!summary ? (
            <p className={binderCss.summaryEmpty}>{guide.emptySummary}</p>
          ) : (
            <>
              <div>
                <p className={binderCss.summaryTargetLabel}>{summary.label}</p>
                <p className={binderCss.summaryTargetValue}>{money(summary.value)}</p>
                <p className={binderCss.summaryMultiplier}>{summary.note}</p>
              </div>

              {summary.hasCurrent && (
                <div className={binderCss.progressBlock}>
                  <svg
                    viewBox="0 0 100 8"
                    preserveAspectRatio="none"
                    className={binderCss.progressSvg}
                    role="img"
                    aria-label={`Progres dana saat ini ${percent(summary.progressPercent)} dari target`}
                  >
                    <rect
                      x="0"
                      y="0"
                      width={summary.progressPercent}
                      height="8"
                      className={binderCss.progressFill}
                    />
                  </svg>
                  <div className={binderCss.summaryStatRow}>
                    <span>Saldo saat ini ({percent(summary.progressPercent)})</span>
                    <strong>{money(summary.current ?? 0)}</strong>
                  </div>
                  <div className={binderCss.summaryStatRow}>
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
              )}

              {summary.extraRows && summary.extraRows.length > 0 && (
                <div className={css.summaryExtraList}>
                  {summary.extraRows.map(([label, val]) => (
                    <div className={binderCss.summaryStatRow} key={label}>
                      <span>{label}</span>
                      <strong>{val}</strong>
                    </div>
                  ))}
                </div>
              )}
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
          tone={sheetTone}
          action={sheetAction}
          tabs={spec.tabs ?? ["Strategi", "Rekomendasi", "Download"]}
        >
          {(panelIndex) =>
            spec.resultsView?.({
              spec,
              result: snapshot.result,
              payload: snapshot.payload,
              answers,
              tab: panelIndex,
            }) ?? (
              <ConversationalResults
                spec={spec}
                result={snapshot.result}
                payload={snapshot.payload}
                answers={answers}
                extra={extra}
                tab={panelIndex}
              />
            )
          }
        </ResultSheet>
      )}
    </div>
  );
}
