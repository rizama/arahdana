import { useState } from 'react';
import type { Result } from '../../domain/calculators/types';
import { money, percent } from '../config';
import { downloadPng, type ExportTheme } from '../export/render-png';
import { DataTable } from './structured';
import css from './conversational.module.css';

const num = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : 0;
const record = (value: unknown): Result => value && typeof value === 'object' && !Array.isArray(value) ? value as Result : {};
const formats = [
  { name: 'Square', ratio: '1:1', size: '1024×1024', portrait: false },
  { name: 'Stories', ratio: '9:16', size: '1080×1920', portrait: true },
] as const;

function Metric({ label, value }: { label: string; value: unknown }) {
  return <div className={css.metricRow}>
    <dt>{label}</dt><dd className={css.tabular}>{typeof value === 'number' ? money(value) : '—'}</dd>
  </div>;
}
function Summary({ result }: { result: Result }) {
  const affordability = result.affordability ? record(result.affordability) : null;
  const payoff = affordability?.accelerated_payoff ? record(affordability.accelerated_payoff) : null;
  return <>
    <section className={css.card}>
      <h3>Ringkasan pinjaman</h3>
      <dl className={css.metrics}>
        <Metric label="Pokok pinjaman" value={result.principal} />
        <Metric label="Cicilan pertama" value={result.first_payment} />
        <Metric label="Total bunga" value={result.total_interest} />
      </dl>
      <p>Total bunga terhadap pokok: <strong className={css.tabular}>{percent(num(result.total_interest_percent))}</strong></p>
    </section>
    <section className={css.card}>
      <h3>Kelayakan Cicilan</h3>
      {affordability ? <>
        <p><strong>{String(affordability.label ?? '')}</strong> — {String(affordability.advice ?? '')}</p>
        <p>Rasio cicilan {percent(num(affordability.ratio_min_percent))}–{percent(num(affordability.ratio_max_percent))}.</p>
      </> : <p>Penghasilan kosong atau 0 melewati evaluasi rasio. Isi penghasilan bulanan untuk mengevaluasi beban cicilan.</p>}
      <ul>
        <li>&lt;15%: Sangat Sehat</li>
        <li>15–&lt;30%: Sehat</li>
        <li>30–&lt;50%: Tidak Sehat</li>
        <li>≥50%: Berbahaya</li>
      </ul>
      {payoff && <>
        <h4>Pelunasan dipercepat</h4>
        <p>{money(num(payoff.low_payment))} / bulan saat fix dan {money(num(payoff.high_payment))} saat floating.</p>
        <p>{payoff.feasible ? `Estimasi ${num(payoff.estimated_months)} bulan.` : 'Tidak tercapai dalam batas simulasi.'} {String(payoff.note ?? '')}</p>
      </>}
    </section>
    <details className={css.card}>
      <summary>Jadwal cicilan bulanan</summary>
      <DataTable caption="Jadwal cicilan bulanan" data={(result.timeline as Result[]) ?? []} columns={[
        ['month', 'Bulan', 'number'], ['payment', 'Cicilan', 'money'],
        ['interest', 'Bunga', 'money'], ['balance', 'Sisa pokok', 'money'],
      ]} />
    </details>
  </>;
}
function Costs({ result }: { result: Result }) {
  const fees = record(result.fees);
  return <>
    <section className={css.card}>
      <h3>Bunga dan sisa pokok</h3>
      <dl className={css.metrics}>
        <Metric label="Total bunga fix" value={result.fixed_interest} />
        <Metric label="Total bunga floating" value={result.floating_interest} />
        <Metric label="Sisa setelah fix" value={result.balance_after_fixed} />
        <Metric label="Cicilan minimum" value={result.min_payment} />
        <Metric label="Cicilan maksimum" value={result.max_payment} />
      </dl>
    </section>
    <section className={css.card}>
      <h3>Estimasi biaya transaksi</h3>
      <dl className={css.metrics}>
        {([
          ['ajb', 'AJB'], ['balik_nama', 'Balik nama'], ['notaris', 'Notaris'],
          ['provisi', 'Provisi'], ['appraisal', 'Appraisal'], ['admin', 'Admin'],
          ['bphtb', 'BPHTB'], ['total_bank_fees', 'Total biaya bank'],
          ['total_other_fees', 'Total biaya lain'],
        ] as const).map(([key, label]) => <Metric key={key} label={label} value={fees[key]} />)}
      </dl>
      <p>{fees.bphtb_included ? 'BPHTB dimasukkan berdasarkan NJOP-TKP.' : 'BPHTB belum dimasukkan; isi NJOP-TKP untuk menghitungnya.'} Biaya mengikuti model simulasi, bukan penawaran bank atau penetapan pajak.</p>
    </section>
  </>;
}
function Download({ result }: { result: Result }) {
  const [name, setName] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  async function save(portrait: boolean, theme: ExportTheme) {
    setBusy(true); setStatus('Menyiapkan gambar…');
    try {
      await downloadPng({ ...result, dream_name: name.trim() }, 'Simulasi KPR', 'simulasi-kpr', portrait, theme, 'Rencana Simulasi KPR');
      setStatus('Unduhan PNG dimulai.');
    } catch { setStatus('Unduhan belum berhasil. Coba lagi.'); }
    finally { setBusy(false); }
  }
  return <>
    <section className={css.card}>
      <label htmlFor="kpr-export-name">Nama kamu (opsional)</label>
      <input id="kpr-export-name" value={name} maxLength={80} aria-describedby="kpr-export-privacy" onChange={event => setName(event.target.value)} />
      <p id="kpr-export-privacy">Nama hanya dipakai di gambar unduhan dan tetap di perangkatmu.</p>
    </section>
    <div className={css.exportCards} aria-busy={busy}>
      {formats.map(({ name: label, ratio, size, portrait }) => <section className={css.card} key={label}>
        <h3>{label} ({ratio})</h3><p>{size} piksel</p>
        <div className={css.exportActions}>{(['Light', 'Dark'] as const).map(theme => <button key={theme} type="button" disabled={busy}
          aria-label={label + ' ' + theme} onClick={() => void save(portrait, theme === 'Light' ? 'light' : 'dark')}>{theme}</button>)}</div>
      </section>)}
    </div>
    <p role="status">{status}</p>
  </>;
}

export function KprResults({ result, tab }: { result: Result; tab: number }) {
  if (tab === 0) return <Summary result={result} />;
  if (tab === 1) return <Costs result={result} />;
  return <Download result={result} />;
}
