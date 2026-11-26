import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { calculate } from '../../src/domain/calculators/calculators';
import type { CalculatorSlug, Result } from '../../src/domain/calculators/types';
import { answerError, type Answers } from '../../src/web/conversational/answers';
import { ConversationalResults, ReturnPanel, durationInstruments } from '../../src/web/conversational/Results';
import { getSpec, type Segment } from '../../src/web/conversational/specs';

const samples: Record<string, Answers> = {
  annuity: { frequency: 'monthly', timing: 'beginning', years: '5', target: '100000000', initial: '0', payment: '1000000', rate: '6' },
  properti: { price: '500000000', dp: '20', years: '5', inflation: '5', formula_policy: 'corrected', initial: '0', payment: '1000000', rate: '6' },
  kendaraan: { price: '200000000', dp: '20', years: '5', inflation: '5', formula_policy: 'corrected', initial: '0', payment: '1000000', rate: '6' },
  barang: { price: '10000000', dp: '10', months: '24', inflation: '5', initial: '0', payment: '100000', rate: '6' },
  'dana-pensiun': { age: '30', retirement_age: '55', expense: '5000000', inflation: '5', initial: '0', payment: '1000000', rate: '6' },
};
const slugs = Object.keys(samples) as CalculatorSlug[];
function build(slug: CalculatorSlug, answers = samples[slug]) {
  const spec = getSpec(slug);
  const payload = spec.toPayload(answers);
  const result = calculate(slug, payload);
  return { spec, answers, payload, result, rec: result.recommendations as Result };
}
function render(slug: CalculatorSlug, tab: number, answers?: Answers, initialSegment?: Segment) {
  const { spec, payload, result } = build(slug, answers);
  return renderToStaticMarkup(<ConversationalResults spec={spec} result={result} payload={payload} tab={tab} initialSegment={initialSegment} />);
}

describe('Tahap 1 rollout — konfigurasi 5 kalkulator linear', () => {
  it.each(slugs)('%s memakai tiga segmen dan bebas tanda seru', slug => {
    const spec = getSpec(slug);
    expect(spec.options).toEqual(['payment', 'duration', 'return']);
    expect(spec.showAllocation).toBe(false);
    const strategy = render(slug, 0), recommendation = render(slug, 1), download = render(slug, 2);
    for (const html of [strategy, recommendation, download]) {
      expect(html).not.toContain('style=');
      expect(html).not.toContain('! Belum Cocok');
      expect(html).not.toContain('NaN');
    }
    expect(strategy).toContain('Strategi ');
    expect(recommendation).toContain('Pilih tipe rekomendasi');
    expect(recommendation).toContain('Nominal');
    expect(recommendation).toContain('Durasi');
    expect(recommendation).toContain('Return');
    expect(download).toContain('1024×1024');
    expect(download).toContain('1080×1920');
  });
  it('/dana-darurat tetap dua segmen dan mempertahankan alokasi 50/50', () => {
    const spec = getSpec('dana-darurat');
    expect(spec.options).toEqual(['payment', 'duration']);
    expect(spec.showAllocation).toBe(true);
    const html = render('dana-darurat', 0, { expense: '1000000', married: 'false', dependents: '0', months: '12', initial: '0', payment: '500000', rate: '6' });
    expect(html).toContain('50% Tabungan Likuid');
    expect(html).toContain('Alokasi Dana Darurat');
  });
});

describe('Validasi batas Tahap 1', () => {
  it('annuity menolak tahun desimal hanya saat Tahunan', () => {
    const years = getSpec('annuity').questions.find(q => q.key === 'years')!;
    expect(answerError(years, '1,5', { frequency: 'monthly' })).toBe('');
    expect(answerError(years, '1,5', { frequency: 'yearly' })).toContain('bilangan bulat');
    expect(answerError(years, '0', { frequency: 'monthly' })).not.toBe('');
    expect(answerError(years, '101', { frequency: 'monthly' })).not.toBe('');
    expect(answerError(years, '1,5', { frequency: 'yearly' })).not.toBe('');
    expect(() => calculate('annuity', { ...build('annuity').payload, frequency: 'yearly', years: 1.5 })).toThrow();
  });
  it('dana-pensiun menolak usia pensiun lebih kecil atau sama dengan usia sekarang', () => {
    const spec = getSpec('dana-pensiun');
    const age = spec.questions.find(q => q.key === 'age')!;
    const retirement = spec.questions.find(q => q.key === 'retirement_age')!;
    expect(answerError(age, '99', {})).toBe('');
    expect(answerError(age, '100', {})).not.toBe('');
    expect(answerError(retirement, '30', { age: '30' })).toBe('Usia pensiun harus lebih besar dari usia sekarang.');
    expect(answerError(retirement, '29', { age: '30' })).toBe('Usia pensiun harus lebih besar dari usia sekarang.');
    expect(answerError(retirement, '31', { age: '30' })).toBe('');
  });
  it('barang mengonversi bulan ke years dan memakai durasi bulan', () => {
    const { payload, rec } = build('barang');
    expect(payload.years).toBeCloseTo(2);
    expect(rec.duration_unit).toBe('months');
    expect(rec.months).not.toBeNull();
    const html = render('barang', 1, undefined, 'duration');
    expect(html).toContain('Durasi investasi');
    expect(html).toContain('bulan');
  });
  it('menerima nol pada DP, inflasi, dana awal, setoran, dan return', () => {
    for (const slug of ['properti', 'kendaraan', 'barang'] as CalculatorSlug[]) {
      const spec = getSpec(slug);
      const key = slug === 'barang' ? 'months' : 'years';
      const answers = { ...samples[slug], dp: '0', inflation: '0', initial: '0', payment: '0', rate: '0', [key]: samples[slug][key] };
      for (const field of ['dp', 'inflation', 'initial', 'payment', 'rate'])
        expect(answerError(spec.questions.find(q => q.key === field)!, answers[field], answers)).toBe('');
      expect(() => build(slug, answers)).not.toThrow();
    }
  });
});

describe('Result sheet Tahap 1', () => {
  it('properti mempertahankan archive_parity, stepped_inflation, dan CTA KPR', () => {
    const { rec } = build('properti');
    expect(rec.archive_parity).toBeTruthy();
    expect(rec.stepped_inflation).toBeTruthy();
    const html = render('properti', 0);
    expect(html).toContain('Perbandingan kebijakan arsip');
    expect(html).toContain('Inflasi bertahap');
    expect(html).toContain('/simulasi-kpr?price=500000000&amp;dp=20');
    expect(html).toContain('Lanjut ke Simulasi KPR →');
  });
  it.each(['kendaraan', 'barang', 'dana-pensiun'] as CalculatorSlug[])('%s menampilkan inflasi bertahap', slug => {
    expect(build(slug).rec.stepped_inflation).toBeTruthy();
    expect(render(slug, 0)).toContain('Inflasi bertahap');
  });
  it('dana-pensiun menampilkan catatan basis target 4% / 25×', () => {
    expect(render('dana-pensiun', 0)).toContain('25× pengeluaran tahunan terinflasi');
  });
  it('segmen Return menampilkan status pencapaian dan breakdown return_*', () => {
    const reached = build('annuity');
    const failed = build('annuity', { ...samples.annuity, payment: '0' });
    expect(typeof reached.rec.return_reaches_target).toBe('boolean');
    for (const { rec, payload } of [reached, failed]) {
      const html = renderToStaticMarkup(<ReturnPanel rec={rec} payload={payload} />);
      expect(html).toContain('/tahun');
      expect(html).toContain('Pokok vs Imbal Hasil');
      expect(html).not.toContain('NaN');
      expect(html).toContain(rec.return_reaches_target === true ? 'Target tercapai pada asumsi return ini.' : 'Belum mencapai target dalam batas asumsi return simulasi');
    }
  });
  it('durasi null tidak menghasilkan NaN', () => {
    const { rec } = build('properti', { ...samples.properti, payment: '0', initial: '0' });
    expect(rec.months ?? rec.years).toBeNull();
    const html = render('properti', 1);
    expect(html).not.toContain('NaN');
    expect(html).not.toContain('undefined');
  });
  it('instrumen durasi mengikuti horizon rekomendasi', () => {
    expect(durationInstruments(0.5)).toContain('Deposito Jangka Pendek');
    expect(durationInstruments(7)).toContain('Saham');
    expect(durationInstruments(20)).toContain('Crypto');
  });
});
