import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { calculate } from '../../src/domain/calculators/calculators';
import type { Result } from '../../src/domain/calculators/types';
import { answerError, furthestStep } from '../../src/web/conversational/answers';
import { ConversationalResults } from '../../src/web/conversational/Results';
import { KprResults } from '../../src/web/conversational/Kpr';
import {
  EducationLevelsView, WeddingBudgetView, educationAfterAge, initialEducation,
  weddingItems, weddingGroups,
} from '../../src/web/conversational/structured';
import { getSpec } from '../../src/web/conversational/specs';

const view = (answers: Record<string, string>, extra: Record<string, unknown> = {}) => ({
  answers, extra, update: () => {}, setExtra: () => {},
});
function build(slug: 'menikah' | 'pendidikan-anak' | 'simulasi-kpr', overrides: Record<string, string> = {}, extra: Record<string, unknown> = {}) {
  const spec = getSpec(slug);
  const base = { ...Object.fromEntries(spec.questions.map(q => [q.key, ''])), ...spec.initialAnswers?.(), ...overrides } as Record<string, string>;
  const merged = { ...base };
  return {
    spec, answers: merged,
    payload: spec.toPayload?.(merged, { ...spec.initialExtraState?.(), ...extra }) as Result,
  };
}
function render(slug: 'menikah' | 'pendidikan-anak', tab: number, answers: Record<string, string>, extra: Record<string, unknown> = {}) {
  const { spec, payload } = build(slug, answers, extra);
  const result = calculate(slug, payload);
  return renderToStaticMarkup(<ConversationalResults spec={spec} result={result} payload={payload} tab={tab} />);
}

describe('Menikah — anggaran dinamis', () => {
  it('simple memakai total anggaran dan menghasilkan target', () => {
    const spec = getSpec('menikah');
    const answers = { ...spec.initialAnswers?.(), wedding_mode: 'simple', budget: '120000000' };
    expect(spec.extraError?.(answers, {})?.wedding_budget).toBe('');
    const payload = spec.toPayload!(answers) as Result;
    expect(payload.budget).toBe(120000000);
    expect(payload).not.toHaveProperty('venue');
    expect(calculate('menikah', payload).target).toBeGreaterThan(0);
  });
  it('detailed menghitung subtotal berjalan dan mengirim 13 pos', () => {
    const spec = getSpec('menikah');
    const answers: Record<string, string> = {
      ...spec.initialAnswers?.(), wedding_mode: 'detailed',
      venue: '30000000', mc: '5000000',
      count_catering: '100', price_catering: '100000',
    };
    expect(spec.extraError?.(answers, {})?.wedding_budget).toBe('');
    const payload = spec.toPayload!(answers) as Result;
    expect(payload.venue).toBe(30000000);
    expect(payload.count_catering).toBe(100);
    expect(payload).not.toHaveProperty('budget');
    const html = renderToStaticMarkup(<WeddingBudgetView view={view(answers)} />);
    expect(html).toContain('Total anggaran saat ini');
    expect(html).toContain('Rp 45.000.000');
    expect(weddingItems).toHaveLength(10);
    expect(weddingGroups).toHaveLength(3);
    const result = calculate('menikah', payload);
    expect((result.breakdown as Result[]).length).toBeGreaterThan(0);
  });
  it('menampilkan rincian, archive_parity, dan stepped_inflation', () => {
    const answers = { ...getSpec('menikah').initialAnswers?.(), wedding_mode: 'detailed' };
    const strategy = render('menikah', 0, answers);
    expect(strategy).toContain('Rincian anggaran menikah');
    expect(strategy).toContain('Perbandingan kebijakan arsip');
    expect(strategy).toContain('Inflasi bertahap');
    expect(strategy).not.toContain('style=');
    expect(strategy).not.toContain('! Belum Cocok');
    const { payload } = build('menikah', answers);
    const rec = calculate('menikah', payload).recommendations as Result;
    expect(rec.archive_parity).toBeTruthy();
    expect(rec.stepped_inflation).toBeTruthy();
  });
});

describe('Pendidikan Anak', () => {
  it('menerima income kosong atau 0 dan menuliskan child_name', () => {
    const spec = getSpec('pendidikan-anak');
    const income = spec.questions.find(q => q.key === 'income')!;
    expect(answerError(income, '', {})).toBe('');
    expect(answerError(income, '0', {})).toBe('');
    const empty = spec.toPayload!({ ...spec.initialAnswers?.(), income: '' }, spec.initialExtraState?.()) as Result;
    const zero = spec.toPayload!({ ...spec.initialAnswers?.(), income: '0' }, spec.initialExtraState?.()) as Result;
    expect(empty.income).toBe(0);
    expect(zero.income).toBe(0);
    expect(empty.child_name).toBe('');
    const result = calculate('pendidikan-anak', empty);
    expect(result.education_stages).toBeTruthy();
  });
  it('resetEducationSelection menutup jenjang yang terlewati', () => {
    const extra = initialEducation();
    const next = educationAfterAge('child_age', '13', { child_age: '0' }, { selected: ['sd', 'smp', 'sma', 's1'], education: extra });
    expect(next.selected).toEqual(['sma', 's1']);
    const html = renderToStaticMarkup(<EducationLevelsView view={view({ child_age: '13' }, next)} />);
    expect(html).toContain('disabled=""');
    expect(html).not.toContain('style=');
  });
  it('menampilkan proporsi svg, rincian, optimizer, dan label Nama anak', () => {
    const strategy = render('pendidikan-anak', 0, {});
    expect(strategy).toContain('<svg');
    expect(strategy).toContain('Rincian biaya pendidikan');
    expect(strategy).toContain('Strategi SD');
    expect(strategy).toContain('Model arsip memakai ulang modal awal');
    expect(strategy).not.toContain('style=');
    expect(strategy).not.toContain('NaN');
    const download = render('pendidikan-anak', 2, {});
    expect(download).toContain('Nama anak (opsional)');
    expect(getSpec('pendidikan-anak').downloadName?.key).toBe('child_name');
  });
});

const kprAnswers: Record<string, string> = {
  price: '500000000', dp: '20', years: '15', rate: '6',
  fixed_months: '36', floating: '10', income: '', njop: '',
};

describe('Simulasi KPR', () => {
  it('prefill URL price/dp membuka langkah years', () => {
    vi.stubGlobal('location', { search: '?price=600000000&dp=25' });
    const spec = getSpec('simulasi-kpr');
    const answers = spec.initialAnswers?.()! as Record<string, string>;
    vi.unstubAllGlobals();
    expect(answers.price).toBe('600000000');
    expect(answers.dp).toBe('25');
    expect(furthestStep(spec.questions, answers, 0)).toBe(2);
    expect(spec.tabs).toEqual(['Ringkasan', 'Biaya Transaksi', 'Download']);
    expect(spec.options).toEqual([]);
  });
  it('income dan njop opsional; 0 tidak menghasilkan NaN', () => {
    const spec = getSpec('simulasi-kpr');
    for (const key of ['income', 'njop']) {
      const question = spec.questions.find(q => q.key === key)!;
      expect(answerError(question, '', {})).toBe('');
      expect(answerError(question, '0', {})).toBe('');
    }
    const payload = spec.toPayload!(kprAnswers) as Result;
    expect(payload.income).toBe(0);
    expect(payload.njop).toBe(0);
    const html = renderToStaticMarkup(<KprResults result={calculate('simulasi-kpr', payload)} tab={0} />);
    expect(html).toContain('Penghasilan kosong atau 0 melewati evaluasi rasio');
    expect(html).not.toContain('NaN');
  });
  it.each([['0', 'belum'], ['5000000', 'Berbahaya'], ['20000000', 'Sehat'], ['100000000', 'Sangat Sehat']])('kelayakan untuk penghasilan %s', (income, label) => {
    const payload = build('simulasi-kpr', { ...kprAnswers, income }).payload;
    const result = calculate('simulasi-kpr', payload);
    if (income === '0') expect(result.affordability).toBeNull();
    else expect(String((result.affordability as Result).label)).toBe(label);
    const html = renderToStaticMarkup(<KprResults result={result} tab={0} />);
    expect(html).not.toContain('NaN');
    if (income === '100000000') {
      expect(html).toContain('Pelunasan dipercepat');
      expect(((result.affordability as Result).accelerated_payoff as Result).feasible).toBe(true);
    }
  });
  it('menampilkan tujuh pos biaya, BPHTB, jadwal, dan tiga tab', () => {
    const payload = build('simulasi-kpr', { ...kprAnswers, njop: '300000000' }).payload;
    const result = calculate('simulasi-kpr', payload);
    const costs = renderToStaticMarkup(<KprResults result={result} tab={1} />);
    for (const label of ['AJB', 'Balik nama', 'Notaris', 'Provisi', 'Appraisal', 'Admin', 'BPHTB', 'Total biaya bank', 'Total biaya lain'])
      expect(costs).toContain(label);
    expect(costs).toContain('BPHTB dimasukkan berdasarkan NJOP-TKP');
    const summary = renderToStaticMarkup(<KprResults result={result} tab={0} />);
    expect(summary).toContain('Jadwal cicilan bulanan');
    const download = renderToStaticMarkup(<KprResults result={result} tab={2} />);
    expect(download).toContain('Nama kamu (opsional)');
    expect(download).toContain('Lanjut tanpa nama');
    const downloadUnlocked = renderToStaticMarkup(
      <KprResults result={result} tab={2} initialExportTheme="light" />,
    );
    expect(downloadUnlocked).toContain('1024×1024');
    expect(downloadUnlocked).toContain('1080×1920');
    for (const html of [summary, costs, download, downloadUnlocked]) {
      expect(html).not.toContain('NaN');
      expect(html).not.toContain('style=');
    }
  });
});
