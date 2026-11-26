import { useRef, useState, type FormEvent } from 'react';
import { post } from '../api';
import { Icon } from '../components/Home';
import { calculators } from '../config';
import type { CalculatorSlug, Result } from '../../domain/calculators/types';
import { answerError, emptyAnswersFor, furthestStep, type Answers } from './answers';
import { PillOptions, UnitInput } from './controls';
import { ResultSheet } from './ResultSheet';
import { ConversationalResults } from './Results';
import { getSpec } from './specs';
import css from './conversational.module.css';

export function ConversationalForm({ slug }: { slug: CalculatorSlug }) {
  const spec = getSpec(slug);
  const questions = spec.questions;
  const startingAnswers = (): Answers => {
    const base = emptyAnswersFor(questions), overrides = spec.initialAnswers?.() ?? {};
    for (const [key, value] of Object.entries(overrides)) if (typeof value === 'string') base[key] = value;
    return base;
  };
  const [answers, setAnswers] = useState<Answers>(startingAnswers);
  const [extra, setExtra] = useState<Record<string, unknown>>(() => spec.initialExtraState?.() ?? {});
  const [maxStepReached, setMaxStepReached] = useState(() => furthestStep(questions, startingAnswers(), 0));
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [snapshot, setSnapshot] = useState<{ result: Result; payload: Result }>();
  const [submission, setSubmission] = useState(0);
  const sheet = useRef<HTMLDialogElement>(null);
  const cta = useRef<HTMLButtonElement>(null);
  const extraErrors = spec.extraError?.(answers, extra) ?? {};
  const errors = questions.map(question =>
    answerError(question, answers[question.key] ?? '', answers) || extraErrors[question.key] || '');
  const firstInvalid = errors.findIndex(Boolean);
  function update(key: string, value: string) {
    const next = { ...answers, [key]: value };
    const nextExtra = spec.onAnswerChange?.(key, value, next, extra) ?? extra;
    setAnswers(next);
    setExtra(nextExtra);
    setTouched(previous => ({ ...previous, [key]: true }));
    setMaxStepReached(previous => furthestStep(questions, next, previous));
    setMessage('');
  }
  const view = { answers, extra, update, setExtra };
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (firstInvalid >= 0) {
      const key = questions[firstInvalid].key;
      setTouched(previous => ({ ...previous, [key]: true }));
      event.currentTarget.querySelector<HTMLInputElement>(`[name="${key}"]`)?.focus();
      return;
    }
    const payload = spec.toPayload(answers, extra);
    setBusy(true);
    setMessage('');
    try {
      const result: Result = await post('/api/calculate/' + slug, payload);
      setSnapshot({ result, payload });
      setSubmission(count => count + 1);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Perhitungan gagal. Coba lagi.');
    } finally {
      setBusy(false);
    }
  }
  return <section className={css.page}>
    <a href="/">← Beranda</a>
    <h1 className={css.title}><Icon path={calculators[slug].icon} /> {spec.title}</h1>
    <blockquote>{spec.quote}</blockquote>
    <p className={css.bubble}>{spec.intro}</p>
    <form onSubmit={submit} noValidate aria-busy={busy}>
      <ol className={css.rail} aria-label={'Langkah rencana ' + spec.title}>
        {questions.map((question, index) => {
          const visible = index <= maxStepReached;
          const state = !visible ? 'upcoming' : errors[index] ? 'active' : 'completed';
          const error = touched[question.key] && errors[index];
          const id = 'emergency-' + question.key;
          return <li key={question.key} data-state={state} hidden={!visible}>
            {index === spec.phase2At && <p className={css.bubble}>{spec.transition}</p>}
            <span className={css.sr}>{state === 'completed' ? 'Selesai.' : state === 'active' ? 'Belum lengkap.' : 'Belum dibuka.'}</span>
            <div className={css.question}>
              <fieldset>
                <legend>{question.options ? question.label : <label htmlFor={id}>{question.labelOf?.(answers) ?? question.label}</label>}</legend>
                <details className={css.help}>
                  <summary aria-label={'Informasi: ' + question.label}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 11v5m0-8h.01" />
                    </svg>
                  </summary>
                  <p>{question.help}</p>
                </details>
                {spec.questionView?.(question.key, view) ?? (question.options ? <PillOptions name={question.key} value={answers[question.key] ?? ''} options={question.options}
                  invalid={!!error} describedBy={error ? id + '-error' : undefined} onValue={value => update(question.key, value)} />
                  : <UnitInput id={id} name={question.key} unit={question.unit} value={answers[question.key] ?? ''}
                    inputMode={question.unit.includes('%') ? 'decimal' : 'numeric'}
                    aria-invalid={error ? true : undefined} aria-describedby={error ? id + '-error' : undefined}
                    onValue={value => update(question.key, value)} />)}
                {spec.questionExtra?.(question.key, view)}
                {question.noteOf?.(answers) && <small>{question.noteOf(answers)}</small>}
                {error && <p className={css.error} id={id + '-error'}>{error}</p>}
              </fieldset>
            </div>
          </li>;
        })}
      </ol>
      <button className={css.cta} ref={cta} hidden={firstInvalid !== -1} disabled={busy} aria-busy={busy}>
        {busy ? 'Menghitung…' : spec.cta ?? 'Ayo lihat hasil strategimu →'}
      </button>
      <p role="status" className={css.error}>{message}</p>
    </form>
    {snapshot && <ResultSheet key={submission} dialog={sheet} returnFocus={cta} onClose={() => cta.current?.focus()}
      title={spec.tabs ? 'Hasil ' + spec.title : 'Hasil Strategi ' + spec.title} tabs={spec.tabs ?? ['Strategi', 'Rekomendasi', 'Download']}>
      {tab => spec.resultsView?.({ spec, result: snapshot.result, payload: snapshot.payload, answers, tab })
        ?? <ConversationalResults spec={spec} result={snapshot.result} payload={snapshot.payload} answers={answers} extra={extra} tab={tab} />}
    </ResultSheet>}
  </section>;
}
