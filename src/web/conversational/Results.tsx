import { useId, useState } from 'react';
import type { Result } from '../../domain/calculators/types';
import { money, percent } from '../config';
import { downloadPng, type ExportTheme } from '../export/render-png';
import { getSpec, type Context, type Segment, type Spec } from './specs';
import { PillOptions } from './controls';
import css from './conversational.module.css';

const number = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : 0;
const month = (value: number) => `${value.toLocaleString('id-ID')} bulan`;
const year = (value: number) => `${value.toLocaleString('id-ID')} tahun`;
type State = 'success' | 'almost' | 'failed';
const titles: Record<State, string> = {
  success: 'Strategi Sudah Cocok',
  almost: 'Strategi Hampir Cocok',
  failed: 'Strategi Belum Cocok',
};

function StatusIcon({ state }: { state: State }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    {state === 'success' ? <path d="m8 12 3 3 5-6" />
      : state === 'almost' ? <path d="M8 12h8" />
      : <path d="M9 9l6 6m0-6-6 6" />}
  </svg>;
}
function duration(rec: Result) {
  if (rec.duration_unit === 'months') {
    const value = number(rec.months ?? rec.years);
    return value ? { value, text: month(value) } : null;
  }
  const value = number(rec.years);
  return value ? { value, text: year(value) } : null;
}
function period(spec: Spec, payload: Result) {
  return spec.slug === 'annuity' && payload.frequency === 'yearly' ? 'tahun' : 'bulan';
}
function instrumentNames(spec: Spec, rec: Result, horizonYears?: number) {
  if (spec.instruments) return [...spec.instruments];
  return horizonYears === undefined ? (rec.instruments as string[]) ?? [] : durationInstruments(horizonYears);
}
export function durationInstruments(years: number) {
  if (years < 1) return ['Reksadana Pasar Uang', 'Deposito Jangka Pendek'];
  if (years <= 5) return ['Reksadana Pendapatan Tetap', 'Obligasi Negara'];
  if (years <= 10) return ['Saham', 'Reksadana Indeks', 'Reksadana Campuran', 'Exchange-Traded Fund (ETF)', 'Emas'];
  return ['Saham', 'Crypto', 'Reksadana Indeks', 'Exchange-Traded Fund (ETF)'];
}
function StatusDetail({ spec, context }: { spec: Spec; context: Context }) {
  const { result, rec, payload } = context;
  const state = result.strategy_state as State;
  const target = number(result.target), projected = number(result.future_value), gap = number(result.gap);
  const coverage = target > 0 ? (projected / target) * 100 : 100;
  const payment = money(number(rec.payment)) + '/' + period(spec, payload);
  const span = duration(rec);
  if (state === 'failed') return <>
    <p>Proyeksi investasimu baru mencapai <strong>{percent(coverage)}</strong> dari target (<strong>{money(projected)}</strong> dari <strong>{money(target)}</strong>), sehingga masih ada kekurangan sebesar <strong>{money(gap)}</strong>.</p>
    {span
      ? <p>Untuk menutup kekurangan ini, naikkan setoran rutin menjadi <strong>{payment}</strong> atau perpanjang durasi menjadi <strong>{span.text}</strong>. Lihat perbandingan lengkapnya di tab <strong>Rekomendasi</strong>.</p>
      : <p>Dengan setoran saat ini target belum tercapai dalam batas simulasi {rec.duration_unit === 'months' ? '1.200 bulan' : '100 tahun'}. Pertimbangkan menaikkan setoran rutin menjadi <strong>{payment}</strong> di tab <strong>Rekomendasi</strong>.</p>}
  </>;
  if (state === 'almost') return <>
    <p>Proyeksi investasimu sudah mencapai <strong>{percent(coverage)}</strong> dari target (<strong>{money(projected)}</strong> dari <strong>{money(target)}</strong>), tersisa kekurangan <strong>{money(gap)}</strong>.</p>
    <p>Sedikit penyesuaian, misalnya setoran <strong>{payment}</strong>{span && <> atau durasi <strong>{span.text}</strong></>}, sudah bisa menutupnya. Detailnya di tab <strong>Rekomendasi</strong>.</p>
  </>;
  return <>
    <p>Proyeksi investasimu mencapai <strong>{money(projected)}</strong> (<strong>{percent(coverage)}</strong> dari target <strong>{money(target)}</strong>){projected > target
      ? <> dengan kelebihan <strong>{money(projected - target)}</strong></>
      : ' — tepat memenuhi target'}.</p>
    <p>Strategi ini siap dijalankan.</p>
  </>;
}
function Breakdown({ result, prefix }: { result: Result; prefix?: string }) {
  const key = (name: string) => prefix ? prefix + '_' + name : name;
  const principal = number(result[key('principal')]);
  const interest = number(result[prefix ? prefix + '_interest' : 'interest_earned']);
  const principalShare = number(result[key('principal_percent')]);
  const interestShare = number(result[key('interest_percent')]);
  const first = Math.max(0, Math.min(100, principalShare));
  const second = Math.max(0, Math.min(100 - first, interestShare));
  return <section className={css.card}>
    <h3>Pokok vs Imbal Hasil</h3>
    <svg className={css.breakdown} viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true">
      <rect className={css.principal} width={first} height="10" />
      <rect className={css.earned} x={first} width={second} height="10" />
    </svg>
    <div className={css.legend}>
      <span>Pokok <strong>{percent(principalShare)} · {money(principal)}</strong></span>
      <span>Imbal hasil <strong>{percent(interestShare)} · {money(interest)}</strong></span>
    </div>
  </section>;
}
function Instruments({ names }: { names: string[] }) {
  return <section className={css.card}>
    <h3>Pilihan Investasi</h3>
    <ul className={css.pills}>{names.map(name => <li key={name}>{name}</li>)}</ul>
    <small>Kenali risiko dan waktu pencairan sebelum memilih instrumen.</small>
  </section>;
}
function Strategy({ spec, context }: { spec: Spec; context: Context }) {
  const { result, rec, payload } = context;
  const state = result.strategy_state as State;
  const target = number(result.target), projected = number(result.future_value), gap = number(result.gap);
  return <>
    <div className={css.status} data-status={state}>
      <strong className={css.statusTitle}><StatusIcon state={state} />{titles[state]}</strong>
      <StatusDetail spec={spec} context={context} />
    </div>
    <section className={css.target}>
      <h3>{spec.targetTitle}</h3>
      <strong>{money(target)}</strong>
      {spec.targetNote?.(context) && <p>{spec.targetNote(context)}</p>}
    </section>
    {spec.showAllocation && <section className={css.card}>
      <h3>Alokasi Dana Darurat</h3>
      <div className={css.split} aria-hidden="true"><span /><span /></div>
      <div className={css.legend}>
        <span>50% Tabungan Likuid<strong>{money(target * 0.5)}</strong></span>
        <span>50% Instrumen investasi<strong>{money(target * 0.5)}</strong></span>
      </div>
      <p>Prioritaskan dana yang cepat cair dan berisiko rendah.</p>
    </section>}
    <section className={css.card}>
      <h3>Strategimu</h3>
      <dl className={css.metrics}>{spec.metrics(context).map(([icon, label, value]) => <div key={label + icon}>
        <dt><span aria-hidden="true">{icon}</span>{label}</dt><dd>{value}</dd>
      </div>)}</dl>
      <p>{gap > 0 ? `Kekurangan: ${money(gap)} dari target` : projected > target ? `Kelebihan: ${money(projected - target)} di atas target` : 'Pas mencapai target'}</p>
    </section>
    <Breakdown result={result} />
    <Instruments names={instrumentNames(spec, rec)} />
    <details className={css.card}>
      <summary>Timeline Proyeksi Tahunan</summary>
      <table><thead><tr><th scope="col">Tahun</th><th scope="col">Nilai investasi</th></tr></thead>
        <tbody>{(result.timeline as Result[]).map(row => <tr key={number(row.year)}><td>{number(row.year)}</td><td>{money(number(row.value))}</td></tr>)}</tbody>
      </table>
    </details>
    {spec.extras?.(context)}
  </>;
}
function Recommendation({ spec, context, initialSegment }: { spec: Spec; context: Context; initialSegment?: Segment }) {
  const [option, setOption] = useState<Segment>(initialSegment ?? spec.options[0]);
  const id = useId();
  const { result, rec, payload } = context;
  const options = spec.options.map(segment => [segment, { payment: 'Nominal', duration: 'Durasi', return: 'Return' }[segment]] as const);
  if (result.strategy_state === 'success' && !spec.options.includes('return')) return <div className={css.status} data-status="success">
    <strong className={css.statusTitle}><StatusIcon state="success" />Strategimu sudah memenuhi target</strong>
    <p>Kamu bisa mempertahankan rencana setoran dan durasi ini.</p>
  </div>;
  const span = duration(rec);
  const periodLabel = period(spec, payload);
  const durationFrom = spec.durationFrom(context);
  const instruments = instrumentNames(spec, rec, number(rec.years ?? payload.years));
  return <>
    <fieldset className={css.segments}>
      <legend>Pilih tipe rekomendasi</legend>
      <PillOptions name={id} value={option} options={options} onValue={value => setOption(value as Segment)} />
    </fieldset>
    {option === 'return' ? <ReturnPanel rec={rec} payload={payload} names={instrumentNames(spec, rec)} /> : option === 'duration' && !span ? <section className={css.card}>
      <h3>Target belum tercapai dalam batas simulasi</h3>
      <p>Pilih Nominal untuk melihat setoran bulanan yang perlu disiapkan.</p>
    </section> : <>
      <section className={css.card}>
        <h3>{option === 'duration' ? 'Durasi investasi' : 'Setoran ' + periodLabel}</h3>
        <p className={css.diff} aria-hidden="true"><s>{option === 'duration' ? durationFrom : money(number(payload.payment)) + '/' + periodLabel}</s> ▸ <strong>{option === 'duration' ? span?.text : money(number(rec.payment)) + '/' + periodLabel}</strong></p>
        <p className={css.sr}>Dari {option === 'duration' ? durationFrom : money(number(payload.payment)) + '/' + periodLabel} menjadi {option === 'duration' ? span?.text : money(number(rec.payment)) + '/' + periodLabel}.</p>
        <p>Proyeksi baru <strong className={css.amount}>{money(number(option === 'duration' ? rec.years_value : rec.payment_value))}</strong></p>
        {number(option === 'duration' ? rec.years_value : rec.payment_value) >= number(result.target) && <p>✓ Memenuhi target</p>}
      </section>
      <Breakdown result={rec} prefix={option === 'duration' ? 'duration' : 'payment'} />
      <Instruments names={option === 'duration' ? instruments : instrumentNames(spec, rec)} />
    </>}
  </>;
}
export function ReturnPanel({ rec, payload, names }: { rec: Result; payload: Result; names?: string[] }) {
  const reaches = rec.return_reaches_target === true;
  return <>
    <section className={css.card}>
      <h3>Asumsi return</h3>
      <p className={css.diff} aria-hidden="true"><s>{percent(number(payload.rate))}/tahun</s> ▸ <strong>{percent(number(rec.return_percent))}/tahun</strong></p>
      <p className={css.sr}>Dari {percent(number(payload.rate))} per tahun menjadi {percent(number(rec.return_percent))} per tahun.</p>
      <p>Proyeksi baru <strong className={css.amount}>{money(number(rec.return_value))}</strong></p>
      <p>{reaches ? 'Target tercapai pada asumsi return ini.' : 'Belum mencapai target dalam batas asumsi return simulasi (maksimal 15%/20%/30% sesuai durasi).'}</p>
      <p>Return adalah asumsi simulasi, bukan jaminan hasil.</p>
    </section>
    <Breakdown result={rec} prefix="return" />
    <Instruments names={names ?? (rec.instruments as string[]) ?? []} />
  </>;
}
const exportFormats = [
  { name: 'Square', ratio: '1:1', size: '1024×1024', portrait: false },
  { name: 'Stories', ratio: '9:16', size: '1080×1920', portrait: true },
] as const;
function Downloads({ spec, result }: { spec: Spec; result: Result }) {
  const [name, setName] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  async function save(portrait: boolean, theme: ExportTheme) {
    setBusy(true);
    setStatus('Menyiapkan gambar…');
    try {
      await downloadPng({ ...result, [nameKey]: name.trim() }, spec.exportTitle, spec.slug, portrait, theme, 'Rencana ' + spec.title);
      setStatus('Unduhan PNG dimulai.');
    } catch {
      setStatus('Unduhan belum berhasil. Coba lagi.');
    } finally {
      setBusy(false);
    }
  }
  const nameKey = spec.downloadName?.key ?? 'dream_name';
  return <>
    <section className={css.card}>
      <label htmlFor="conversational-export-name">{spec.downloadName?.label ?? 'Nama kamu (opsional)'}</label>
      <input id="conversational-export-name" value={name} maxLength={80} placeholder="Contoh: Nadia"
        aria-describedby="conversational-export-privacy" onChange={event => setName(event.target.value)} />
      <p id="conversational-export-privacy">Nama hanya dipakai di gambar unduhan dan tetap di perangkatmu.</p>
    </section>
    <div className={css.exportCards} aria-busy={busy}>
      {exportFormats.map(({ name: label, ratio, size, portrait }) => <section className={css.card} key={label}>
        <h3>{label} ({ratio})</h3><p>{size} piksel</p>
        <div className={css.exportActions}>{(['Light', 'Dark'] as const).map(theme => <button key={theme}
          type="button" disabled={busy} aria-label={label + ' ' + theme}
          onClick={() => void save(portrait, theme === 'Light' ? 'light' : 'dark')}>{theme}</button>)}</div>
      </section>)}
    </div>
    <p role="status">{status}</p>
  </>;
}

export function ConversationalResults({ spec, result, payload, answers, extra, tab, initialSegment }: {
  spec: Spec; result: Result; payload: Result; answers?: Record<string, string>; extra?: Record<string, unknown>; tab: number; initialSegment?: Segment;
}) {
  const context: Context = { spec, result, payload, answers, extra, rec: result.recommendations as Result };
  if (tab === 0) return <Strategy spec={spec} context={context} />;
  if (tab === 1) return <Recommendation spec={spec} context={context} initialSegment={initialSegment} />;
  return <Downloads spec={spec} result={result} />;
}

export function EmergencyResults({ result, input, tab }: { result: Result; input: Result; tab: number }) {
  return <ConversationalResults spec={getSpec('dana-darurat')} result={result} payload={input} tab={tab} />;
}
