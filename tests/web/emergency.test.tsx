import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { calculate } from '../../src/domain/calculators/calculators';
import type { Result } from '../../src/domain/calculators/types';
import { money } from '../../src/web/config';
import { answerError, emptyAnswers, formatRupiah, furthestStep, parseRupiah, questions, toPayload } from '../../src/web/emergency/answers';
import { EmergencyResults, durationInstruments } from '../../src/web/emergency/Results';
import { ConversationalResults } from '../../src/web/conversational/Results';
import { getSpec } from '../../src/web/conversational/specs';

const answers = { expense: '1.000.000', married: 'false', dependents: '0', months: '12', initial: '0', payment: '0', rate: '0' };
describe('Dana Darurat conversational form', () => {
  it('formats pasted currency and keeps an empty answer distinct from zero', () => {
    expect(formatRupiah('Rp 5.000,000 a')).toBe('5.000.000');
    expect(parseRupiah('5.000.000')).toBe(5_000_000);
    expect(parseRupiah('0')).toBe(0);
    expect(parseRupiah('')).toBeNaN();
  });
  const bounds = [
    ['expense', ['1', '1000000000000000'], ['0', '1000000000000001', '']],
    ['married', ['true', 'false'], ['0', '']],
    ['dependents', ['0', '100'], ['-1', '101', '1.5', '']],
    ['months', ['1', '1200'], ['0', '1201', '1.5', '']],
    ['initial', ['0', '1000000000000000'], ['1000000000000001', '']],
    ['payment', ['0', '1000000000000000'], ['1000000000000001', '']],
    ['rate', ['0', '0,5', '100'], ['-1', '100.1', '', '1e1']],
  ] as const;
  it.each(bounds)('validates %s boundaries', (key, valid, invalid) => {
    const question = questions.find(q => q.key === key)!;
    valid.forEach(value => expect(answerError(question, value)).toBe(''));
    invalid.forEach(value => expect(answerError(question, value)).not.toBe(''));
  });
  it('reaches seven steps with zeros and retains progress after editing', () => {
    let current = emptyAnswers;
    let reached = 0;
    questions.forEach((q, i) => {
      current = { ...current, [q.key]: answers[q.key] };
      reached = furthestStep(current, reached);
      expect(reached).toBe(Math.min(i + 1, 6));
    });
    expect(furthestStep({ ...current, expense: '' }, reached)).toBe(6);
    expect(furthestStep({ ...current, dependents: '' }, reached)).toBe(6);
  });
  it.each([1, 11, 12, 1199, 1200])('converts %i months to years through the domain', (months) => {
    const input = toPayload({ ...answers, months: String(months), rate: '0,5' });
    expect(input).toMatchObject({ years: months / 12, expense: 1000000, rate: 0.5, dream_name: '', married: false });
    expect(calculate('dana-darurat', input).target).toBe(6000000);
  });
});
describe('Dana Darurat result sheet panels', () => {
  it.each([['0', 'Belum Cocok', 'danger'], ['450000', 'Hampir', 'danger'], ['500000', 'Cocok', 'success']])('renders strategy for %s monthly', (payment, label, tone) => {
    const input = toPayload({ ...answers, payment });
    const result = calculate('dana-darurat', input);
    const strategy = renderToStaticMarkup(<EmergencyResults result={result} input={input} tab={0} />);
    expect(strategy).toContain(label);
    expect(strategy).toContain(`data-tone="${tone}"`);
    expect(strategy).toContain('50% Tabungan Likuid');
    expect(strategy).not.toContain('style=');
    const rec = renderToStaticMarkup(<EmergencyResults result={result} input={input} tab={1} />);
    expect(rec).toContain(label === 'Cocok' ? 'Strategimu sudah memenuhi target' : 'Pilih tipe rekomendasi');
    expect(rec).not.toContain('NaN');
    if (payment === '0') {
      expect((result.recommendations as Result).months).toBeNull();
      const recDuration = renderToStaticMarkup(<EmergencyResults result={result} input={input} tab={1} initialSegment="duration" />);
      expect(recDuration).toContain('data-tone="danger"');
    }
  });
  it.each([11/12, 1, 5, 61/12, 10, 121/12])('matches domain instrument tier at %s years', (years) => {
    const result = calculate('dana-darurat', { ...toPayload(answers), years });
    expect(durationInstruments(years)).toEqual((result.recommendations as Result).instruments);
  });
});
describe('Dana Darurat status banner', () => {
  const n = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? v : 0;
  const render = (payment: string) => {
    const input = toPayload({ ...answers, payment });
    const result = calculate('dana-darurat', input);
    return {
      result,
      html: renderToStaticMarkup(<EmergencyResults result={result} input={input} tab={0} />),
    };
  };
  it.each([
    ['0', 'Belum Cocok', 'Kekurangan:', '1.200 bulan', 'belum tercapai'],
    ['450000', 'Hampir Cocok', 'Kekurangan:', '14 bulan', 'penyesuaian'],
    ['500000', 'Sudah Cocok', 'Pas mencapai target', 'siap dijalankan', 'tepat memenuhi target'],
    ['600000', 'Sudah Cocok', 'Kelebihan:', 'siap dijalankan', 'dengan kelebihan'],
  ])('renders a clean, informative banner for %s', (payment, title, summary, detail, note) => {
    const { result, html } = render(payment);
    expect(html).toContain('Strategi ' + title);
    expect(html).not.toContain('! Belum Cocok');
    expect(html).not.toContain('! Kurang');
    expect(html).not.toContain('NaN');
    expect(html).toContain('%');
    expect(html).toContain(money(n(result.target)));
    expect(html).toContain(money(n(result.future_value)));
    expect(html).toContain(summary);
    expect(html).toContain(detail);
    expect(html).toContain(note);
    const rec = result.recommendations as Result;
    if (result.strategy_state !== 'success') {
      expect(html).toContain(money(n(result.gap)));
      expect(html).toContain(money(n(rec.payment)) + '/bulan');
    }
    expect(html).toContain('<svg');
  });
  it('stays clean when recommendations have no month estimate', () => {
    const { result, html } = render('0');
    expect((result.recommendations as Result).months).toBeNull();
    expect(html).toContain('1.200 bulan');
    expect(html).not.toContain('NaN');
    expect(html).not.toContain('undefined');
  });
});
describe('Dana Darurat hasil sesuai referensi Arda', () => {
  const input = {
    expense: 1000000, married: false, dependents: 0, years: 1,
    initial: 4000000, payment: 1000000, rate: 5, dream_name: '',
  };
  const ordered = ['Deposito', 'Emas', 'US Dollar', 'Reksadana Pasar Uang', 'Reksadana Pendapatan Tetap Tertentu'];
  const result = calculate('dana-darurat', input);
  const strategy = () => renderToStaticMarkup(<EmergencyResults result={result} input={input} tab={0} />);
  function expectOrder(html: string) {
    let previous = -1;
    for (const name of ordered) {
      const index = html.indexOf(name);
      expect(index, name).toBeGreaterThan(previous);
      previous = index;
    }
    expect(html).not.toContain('Reksadana Pendapatan Tetap<');
    expect(html).not.toContain('Obligasi Negara');
  }
  it('membaca interest_earned dan menampilkan alokasi 50% Instrumen investasi', () => {
    expect(result.target).toBe(6000000);
    expect(Math.round((result.future_value as number) * 100) / 100).toBe(16534664.98);
    expect(result.principal).toBe(16000000);
    expect(Math.round(result.interest_earned as number)).toBe(534665);
    const html = strategy();
    expect(html).toContain('50% Instrumen investasi');
    expect(html).not.toContain('50% Reksadana Pasar Uang');
    expect(html).toContain(money(16000000));
    expect(html).toContain(money(result.interest_earned as number));
    expect(html).toContain('3,23%');
    expect(html).not.toContain('NaN');
  });
  it('memakai urutan instrumen khusus pada Strategi dan opsi Nominal/Durasi', () => {
    expectOrder(strategy());
    const spec = getSpec('dana-darurat');
    const failedInput = { ...input, initial: 0, payment: 100000 };
    const failed = calculate('dana-darurat', failedInput);
    for (const segment of ['payment', 'duration'] as const) {
      const html = renderToStaticMarkup(<ConversationalResults spec={spec} result={failed} payload={failedInput} tab={1} initialSegment={segment} />);
      expectOrder(html);
    }
  });
  it('tetap konsisten dan bebas NaN pada jalur rekomendasi yang gagal', () => {
    const failedInput = { ...input, initial: 0, payment: 0 };
    const failed = calculate('dana-darurat', failedInput);
    const spec = getSpec('dana-darurat');
    const html = renderToStaticMarkup(<ConversationalResults spec={spec} result={failed} payload={failedInput} tab={1} initialSegment="payment" />);
    expect(html).toContain('Nominal');
    expect(html).toContain('Durasi');
    expect(html).not.toContain('NaN');
    expect(html).not.toContain('! Belum Cocok');
    expectOrder(html);
  });
});
