import type { ReactNode } from 'react';
import type { CalculatorSlug, Result } from '../../domain/calculators/types';
import { money, percent } from '../config';
import { answerError, decimal, parseRupiah, type Answers, type Question } from './answers';
import { DataTable, StackedBar, WeddingBudgetView, EducationLevelsView, KprPrincipalNote, weddingBudgetError, educationLevelsError, educationAfterAge, educationPayload, initialEducation, weddingItems, weddingGroups, stageRows } from './structured';
import { KprResults } from './Kpr';
import { EMERGENCY_INSTRUMENTS, emergencyMultiplier } from '../emergency/summary';
import css from './conversational.module.css';

export type Segment = 'payment' | 'duration' | 'return';
export type ExtraContext = {
  answers: Answers;
  extra: Record<string, unknown>;
  update: (key: string, value: string) => void;
  setExtra: (next: Record<string, unknown>) => void;
};
export type Context = {
  spec: Spec;
  answers?: Answers;
  extra?: Record<string, unknown>;
  payload: Result;
  result: Result;
  rec: Result;
};
export type Spec = {
  slug: CalculatorSlug;
  title: string;
  quote: string;
  intro: string;
  transition: string;
  questions: readonly Question[];
  phase2At: number;
  toPayload: (answers: Answers, extra?: Record<string, unknown>) => Result;
  options: readonly Segment[];
  instruments?: readonly string[];
  showAllocation: boolean;
  targetTitle: string;
  exportTitle: string;
  cta?: string;
  tabs?: readonly string[];
  initialAnswers?: () => Partial<Answers>;
  initialExtraState?: () => Record<string, unknown>;
  onAnswerChange?: (key: string, value: string, answers: Answers, extra: Record<string, unknown>) => Record<string, unknown>;
  targetNote?: (context: Context) => ReactNode;
  metrics: (context: Context) => readonly (readonly [string, string, string])[];
  durationFrom: (context: Context) => string;
  questionView?: (key: string, view: ExtraContext) => ReactNode;
  questionExtra?: (key: string, view: ExtraContext) => ReactNode;
  extraError?: (answers: Answers, extra: Record<string, unknown>) => Record<string, string>;
  extras?: (context: Context) => ReactNode;
  resultsView?: (props: { spec: Spec; result: Result; payload: Result; answers: Answers; tab: number }) => ReactNode;
  downloadName?: { label: string; key: 'dream_name' | 'child_name' };
};

const month = (value: number) => `${value.toLocaleString('id-ID')} bulan`;
const year = (value: number) => `${value.toLocaleString('id-ID')} tahun`;
const number = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : 0;
const currency = (value: string) => parseRupiah(value);
const decimalOf = (value: string) => decimal(value);
const moneyQuestion = (key: string, label: string, help: string, min = 0): Question =>
  ({ key, label, unit: 'Rp', help, min, max: 1e15 });
const percentQuestion = (key: string, label: string, help: string): Question =>
  ({ key, label, unit: '%/tahun', help, min: 0, max: 100, integer: false });
const phase2 = [
  moneyQuestion('initial', 'Dana awal', 'Masukkan dana yang sudah kamu siapkan. Isi 0 jika belum ada.'),
  moneyQuestion('payment', 'Investasi rutin', 'Masukkan nominal yang sanggup kamu sisihkan. Isi 0 jika belum ada.'),
  percentQuestion('rate', 'Asumsi return produk investasi', 'Return adalah asumsi simulasi, bukan jaminan hasil.'),
];
const investmentMetrics = (context: Context, durationLabel: string, extra: readonly (readonly [string, string, string])[] = []): readonly (readonly [string, string, string])[] => {
  const rows: (readonly [string, string, string])[] = [
    ['◈', 'Dana awal', money(number(context.payload.initial))],
    ['+', 'Investasi rutin', money(number(context.payload.payment))],
    ['%', 'Return asumsi', percent(number(context.payload.rate)) + '/tahun'],
    ['◷', durationLabel, context.spec.durationFrom(context)],
    ['↗', 'Hasil proyeksi investasi', money(number(context.result.future_value))],
  ];
  return [...rows, ...extra];
};
const assetQuestions = (priceLabel: string, priceHelp: string, duration: Question): Question[] => [
  moneyQuestion('price', priceLabel, priceHelp, 1),
  { key: 'dp', label: 'Persentase DP / bagian yang disiapkan', unit: '%', help: 'Isi 0 jika belum menyiapkan DP. Persentase ini dihitung dari harga saat ini.', min: 0, max: 100 },
  duration,
  percentQuestion('inflation', 'Asumsi inflasi per tahun', 'Inflasi menaikkan target di masa depan. Isi 0 jika tidak ingin diperhitungkan.'),
  { key: 'formula_policy', label: 'Kebijakan rumus nominal', unit: '', help: 'Terkoreksi memakai return input. Arsip memakai durasi tahun sebagai return nominal.', options: [['corrected', 'Terkoreksi'], ['archive', 'Arsip']] },
  ...phase2,
];
const assetPayload = (answers: Answers, durationKey: 'years' | 'months') => ({
  price: currency(answers.price),
  dp: decimalOf(answers.dp),
  [durationKey]: durationKey === 'months' ? Number(answers.months) : decimalOf(answers.years),
  inflation: decimalOf(answers.inflation),
  formula_policy: answers.formula_policy,
  initial: currency(answers.initial),
  payment: currency(answers.payment),
  rate: decimalOf(answers.rate),
  dream_name: '',
});
export const parityNote = (context: Context) => {
  const parity = context.rec.archive_parity as Result | undefined;
  const stepped = context.rec.stepped_inflation as Result | undefined;
  return <>
    {parity && <section className={css.card}><h3>Perbandingan kebijakan arsip</h3>
      <p>Rekomendasi arsip: <strong>{money(number(parity.payment))}</strong> per periode dengan proyeksi <strong>{money(number(parity.payment_value))}</strong>.</p>
      <p>{String(parity.note ?? '')}</p>
    </section>}
    {stepped && <section className={css.card}><h3>Inflasi bertahap</h3>
      <p>{stepped.reaches_target
        ? `Target tercapai dalam ${year(number(stepped.years))} dengan proyeksi ${money(number(stepped.value))}.`
        : 'Target belum tercapai dalam batas simulasi pada asumsi inflasi bertahap.'}</p>
      <p>{String(stepped.policy_note ?? '')}</p>
    </section>}
  </>;
};

export const specs: Partial<Record<CalculatorSlug, Spec>> = {
  'dana-darurat': {
    slug: 'dana-darurat',
    title: 'Dana Darurat',
    quote: '“Mulai dari biaya hidup sebulan. Dari situ, kamu bisa menghitung cadangan yang perlu disiapkan.”',
    intro: 'Mulai dari persiapanmu.',
    transition: 'Terima kasih! Selanjutnya, ayo atur strategi investasimu.',
    phase2At: 4,
    options: ['payment', 'duration'],
    instruments: [...EMERGENCY_INSTRUMENTS],
    showAllocation: true,
    targetTitle: 'Dana darurat yang kamu butuhkan',
    exportTitle: 'Dana Darurat',
    questions: [
      moneyQuestion('expense', 'Pengeluaran wajib per bulan', 'Masukkan kebutuhan rutin seperti makan, tagihan, dan cicilan wajib.', 1),
      { key: 'married', label: 'Apakah kamu sudah menikah?', unit: '', help: 'Status menikah memengaruhi jumlah bulan pengeluaran yang perlu disiapkan.', options: [['true', 'Sudah'], ['false', 'Belum']] },
      { key: 'dependents', label: 'Jumlah tanggungan', unit: 'orang', help: 'Hitung orang yang biaya hidupnya kamu tanggung.', min: 0, max: 100 },
      { key: 'months', label: 'Target durasi mengumpulkan', unit: 'bulan', help: 'Masukkan waktu yang kamu siapkan untuk mencapai target.', min: 1, max: 1200 },
      { ...phase2[0], label: 'Dana darurat saat ini' },
      { ...phase2[1], label: 'Target investasi per bulan' },
      phase2[2],
    ],
    toPayload: answers => ({
      expense: currency(answers.expense), married: answers.married === 'true',
      dependents: Number(answers.dependents), years: Number(answers.months) / 12,
      initial: currency(answers.initial), payment: currency(answers.payment),
      rate: decimalOf(answers.rate), dream_name: '',
    }),
    questionExtra: (key, view) => key === 'expense' && view.answers.expense && !answerError(specs['dana-darurat']!.questions[0], view.answers.expense, view.answers) ?
      <div className={css.annualExpense}>
        <span id="annual-expense-label">Pengeluaran wajib per tahun</span>
        <output htmlFor="emergency-expense" aria-labelledby="annual-expense-label">{money(currency(view.answers.expense) * 12)}</output>
        <small>Pengeluaran per bulan × 12 bulan</small>
      </div> : null,
    targetNote: ({ payload }) => {
      const multiplier = emergencyMultiplier(payload.married === true, Number(payload.dependents));
      return `${multiplier}× pengeluaran wajib bulanan (${payload.married === true ? 'Sudah menikah' : 'Belum menikah'}, ${payload.dependents} tanggungan)`;
    },
    metrics: context => [
      ['◈', 'Dana darurat saat ini', money(number(context.payload.initial))],
      ['+', 'Investasi per bulan', money(number(context.payload.payment))],
      ['%', 'Return asumsi', percent(number(context.payload.rate)) + '/tahun'],
      ['◷', 'Lama investasi', month(Math.round(number(context.payload.years) * 12))],
      ['↗', 'Hasil proyeksi investasi', money(number(context.result.future_value))],
    ],
    durationFrom: context => month(Math.round(number(context.payload.years) * 12)),
  },
  annuity: {
    slug: 'annuity',
    title: 'Kalkulator Investasi',
    quote: '“Kebiasaan kecil yang dijalani konsisten bisa tumbuh menjadi rencana besar.”',
    intro: 'Mulai dari persiapanmu.',
    transition: 'Terima kasih! Selanjutnya, ayo atur strategi investasimu.',
    phase2At: 4,
    options: ['payment', 'duration', 'return'],
    showAllocation: false,
    targetTitle: 'Target dana yang kamu inginkan',
    exportTitle: 'Kalkulator Investasi',
    questions: [
      { key: 'frequency', label: 'Periode investasi', unit: '', help: 'Pilih Bulanan atau Tahunan untuk menentukan jadwal setoran.', options: [['monthly', 'Bulanan'], ['yearly', 'Tahunan']] },
      { key: 'timing', label: 'Waktu setoran', unit: '', help: 'Setoran di awal periode memberi waktu tumbuh lebih lama.', options: [['beginning', 'Awal periode'], ['end', 'Akhir periode']] },
      { key: 'years', label: 'Durasi investasi', unit: 'tahun', help: 'Isi pecahan tahun untuk durasi Bulanan. Jika Tahunan, isi bilangan bulat.', min: 1 / 12, max: 100, integer: false, validate: (value, answers) =>
        answers.frequency === 'yearly' && !Number.isInteger(decimal(value)) ? 'Untuk periode Tahunan, isi durasi dengan bilangan bulat.' : '' },
      moneyQuestion('target', 'Target dana', 'Masukkan nominal dana yang ingin kamu capai.', 1),
      phase2[0],
      { ...phase2[1], label: 'Investasi rutin', labelOf: answers => 'Investasi per ' + (answers.frequency === 'yearly' ? 'tahun' : 'bulan') },
      phase2[2],
    ],
    toPayload: answers => ({
      frequency: answers.frequency, timing: answers.timing, years: decimalOf(answers.years),
      target: currency(answers.target), initial: currency(answers.initial),
      payment: currency(answers.payment), rate: decimalOf(answers.rate), dream_name: '',
    }),
    metrics: context => investmentMetrics(context, 'Lama investasi'),
    durationFrom: context => year(number(context.payload.years)),
  },
  properti: {
    slug: 'properti',
    title: 'DP Properti',
    quote: '“Rumah dimulai dari langkah kecil yang disiapkan hari ini.”',
    intro: 'Mulai dari persiapanmu.',
    transition: 'Terima kasih! Selanjutnya, ayo atur strategi investasimu.',
    phase2At: 5,
    options: ['payment', 'duration', 'return'],
    showAllocation: false,
    targetTitle: 'DP yang perlu kamu siapkan',
    exportTitle: 'DP Properti',
    questions: assetQuestions('Harga properti saat ini', 'Masukkan harga properti yang kamu incar saat ini.',
      { key: 'years', label: 'Waktu menuju target', unit: 'tahun', help: 'Boleh isi pecahan tahun, misalnya 2,5 tahun.', min: 1 / 12, max: 100, integer: false }),
    toPayload: answers => assetPayload(answers, 'years'),
    questionExtra: (key, view) => key === 'dp' && view.answers.dp ?
      <p className={css.note}>DP saat ini sekitar <strong>{money(currency(view.answers.price) * decimalOf(view.answers.dp) / 100)}</strong> dari harga properti.</p> : null,
    metrics: context => investmentMetrics(context, 'Waktu menuju target'),
    durationFrom: context => year(number(context.payload.years)),
    extras: context => <>{parityNote(context)}<p><a className={css.ctaLink} href={'/simulasi-kpr?price=' + number(context.payload.price) + '&dp=' + number(context.payload.dp)}>Lanjut ke Simulasi KPR →</a></p></>,
  },
  kendaraan: {
    slug: 'kendaraan',
    title: 'Kendaraan',
    quote: '“Perjalanan berikutnya dimulai dari persiapan yang matang.”',
    intro: 'Mulai dari persiapanmu.',
    transition: 'Terima kasih! Selanjutnya, ayo atur strategi investasimu.',
    phase2At: 5,
    options: ['payment', 'duration', 'return'],
    showAllocation: false,
    targetTitle: 'DP yang perlu kamu siapkan',
    exportTitle: 'Kendaraan',
    questions: assetQuestions('Harga kendaraan', 'Masukkan harga kendaraan yang ingin kamu beli.',
      { key: 'years', label: 'Waktu menuju target', unit: 'tahun', help: 'Boleh isi pecahan tahun, misalnya 2,5 tahun.', min: 1 / 12, max: 100, integer: false }),
    toPayload: answers => assetPayload(answers, 'years'),
    questionExtra: (key, view) => key === 'dp' && view.answers.dp ?
      <p className={css.note}>DP saat ini sekitar <strong>{money(currency(view.answers.price) * decimalOf(view.answers.dp) / 100)}</strong> dari harga kendaraan.</p> : null,
    metrics: context => investmentMetrics(context, 'Waktu menuju target'),
    durationFrom: context => year(number(context.payload.years)),
    extras: parityNote,
  },
  barang: {
    slug: 'barang',
    title: 'Barang',
    quote: '“Keinginan bisa jadi rencana saat ada angka dan waktunya.”',
    intro: 'Mulai dari persiapanmu.',
    transition: 'Terima kasih! Selanjutnya, ayo atur strategi investasimu.',
    phase2At: 4,
    options: ['payment', 'duration', 'return'],
    showAllocation: false,
    targetTitle: 'Bagian harga yang perlu disiapkan',
    exportTitle: 'Barang',
    questions: [
      moneyQuestion('price', 'Harga barang', 'Masukkan harga barang yang ingin kamu beli.', 1),
      { key: 'dp', label: 'Bagian yang disiapkan', unit: '%', help: 'Isi 0 jika belum menyiapkan bagian dari harga barang.', min: 0, max: 100 },
      { key: 'months', label: 'Durasi menuju target', unit: 'bulan', help: 'Isi dalam bulan agar hasil perbandingan memakai satuan yang sama.', min: 1, max: 1200 },
      percentQuestion('inflation', 'Asumsi inflasi per tahun', 'Inflasi menaikkan target di masa depan. Isi 0 jika tidak ingin diperhitungkan.'),
      ...phase2,
    ],
    toPayload: answers => ({
      price: currency(answers.price), dp: decimalOf(answers.dp),
      years: Number(answers.months) / 12, inflation: decimalOf(answers.inflation),
      initial: currency(answers.initial), payment: currency(answers.payment),
      rate: decimalOf(answers.rate), dream_name: '',
    }),
    metrics: context => investmentMetrics(context, 'Durasi menuju target'),
    durationFrom: context => month(Math.round(number(context.payload.years) * 12)),
    extras: parityNote,
  },
  'dana-pensiun': {
    slug: 'dana-pensiun',
    title: 'Dana Pensiun',
    quote: '“Masa depan yang tenang dimulai dari keputusan yang dibuat hari ini.”',
    intro: 'Mulai dari persiapanmu.',
    transition: 'Terima kasih! Selanjutnya, ayo atur strategi investasimu.',
    phase2At: 4,
    options: ['payment', 'duration', 'return'],
    showAllocation: false,
    targetTitle: 'Dana pensiun yang kamu butuhkan',
    exportTitle: 'Dana Pensiun',
    questions: [
      { key: 'age', label: 'Usia sekarang', unit: 'tahun', help: 'Isi usiamu saat ini dalam tahun penuh.', min: 0, max: 99 },
      { key: 'retirement_age', label: 'Usia target pensiun', unit: 'tahun', help: 'Usia pensiun harus lebih besar dari usia sekarang.', min: 1, max: 100, validate: (value, answers) =>
        answers.age && Number(value) <= Number(answers.age) ? 'Usia pensiun harus lebih besar dari usia sekarang.' : '' },
      moneyQuestion('expense', 'Pengeluaran bulanan saat ini', 'Masukkan kebutuhan rutin bulanan sebagai dasar target dana pensiun.', 1),
      percentQuestion('inflation', 'Asumsi inflasi per tahun', 'Inflasi menaikkan kebutuhan di masa pensiun. Isi 0 jika tidak ingin diperhitungkan.'),
      ...phase2,
    ],
    toPayload: answers => ({
      age: Number(answers.age), retirement_age: Number(answers.retirement_age),
      expense: currency(answers.expense), inflation: decimalOf(answers.inflation),
      initial: currency(answers.initial), payment: currency(answers.payment),
      rate: decimalOf(answers.rate), dream_name: '',
    }),
    targetNote: () => 'Target dihitung dari 25× pengeluaran tahunan terinflasi (aturan 4%).',
    metrics: context => {
      const base = investmentMetrics(context, 'Waktu menuju pensiun');
      return [
        ['◈', 'Usia sekarang', year(number(context.payload.age))],
        ['◷', 'Usia pensiun', year(number(context.payload.retirement_age))],
        base[0], base[1], base[4],
      ] as (readonly [string, string, string])[];
    },
    durationFrom: context => year(number(context.payload.retirement_age) - number(context.payload.age)),
    extras: parityNote,
  },
  menikah: {
    slug: 'menikah',
    title: 'Menikah',
    quote: '“Rencana yang matang membuat hari istimewa terasa lebih tenang.”',
    intro: 'Mulai dari persiapanmu.',
    transition: 'Terima kasih! Selanjutnya, ayo atur strategi investasimu.',
    phase2At: 5,
    options: ['payment', 'duration', 'return'],
    showAllocation: false,
    targetTitle: 'Anggaran yang perlu kamu siapkan',
    exportTitle: 'Menikah',
    questions: [
      { key: 'years', label: 'Waktu menuju pernikahan', unit: 'tahun', help: 'Boleh isi pecahan tahun, misalnya 1,5 tahun.', min: 1 / 12, max: 100, integer: false },
      percentQuestion('inflation', 'Asumsi inflasi per tahun', 'Inflasi menaikkan biaya di masa depan. Isi 0 jika tidak ingin diperhitungkan.'),
      { key: 'wedding_mode', label: 'Cara mengisi biaya', unit: '', help: 'Pilih total anggaran atau rincian 13 pos biaya.', options: [['simple', 'Total anggaran'], ['detailed', 'Rincian 13 pos biaya']] },
      { key: 'wedding_budget', label: 'Anggaran menikah', unit: '', help: 'Isi total anggaran atau rincian pos biaya sesuai pilihanmu.', optional: true },
      { key: 'formula_policy', label: 'Kebijakan rumus nominal', unit: '', help: 'Terkoreksi memakai return input. Arsip memakai durasi tahun sebagai return nominal.', options: [['corrected', 'Terkoreksi'], ['archive', 'Arsip']] },
      ...phase2,
    ],
    initialAnswers: () => ({
      wedding_mode: 'simple', budget: '100000000', years: '2', inflation: '5',
      formula_policy: 'corrected', initial: '0', payment: '1000000', rate: '6',
      ...Object.fromEntries(weddingItems.map(([key]) => [key, '0'])),
      ...Object.fromEntries(weddingGroups.flatMap(([key]) => [
        ['count_' + key, '100'], ['price_' + key, '0'],
      ])),
    }),
    questionView: (key, view) => key === 'wedding_budget' ? <WeddingBudgetView view={view} /> : null,
    extraError: answers => ({ wedding_budget: weddingBudgetError(answers) }),
    toPayload: answers => {
      const data: Result = {
        years: decimalOf(answers.years), inflation: decimalOf(answers.inflation),
        wedding_mode: answers.wedding_mode, formula_policy: answers.formula_policy,
        initial: currency(answers.initial), payment: currency(answers.payment),
        rate: decimalOf(answers.rate), dream_name: '',
      };
      if (answers.wedding_mode === 'detailed') {
        for (const [key] of weddingItems) data[key] = currency(answers[key] ?? '0');
        for (const [key] of weddingGroups) {
          data['count_' + key] = Number(answers['count_' + key] ?? 0);
          data['price_' + key] = currency(answers['price_' + key] ?? '0');
        }
      } else data.budget = currency(answers.budget ?? '0');
      return data;
    },
    metrics: context => [
      ['◈', 'Dana awal', money(number(context.payload.initial))],
      ['+', 'Investasi per bulan', money(number(context.payload.payment))],
      ['%', 'Return asumsi', percent(number(context.payload.rate)) + '/tahun'],
      ['◷', 'Waktu menuju pernikahan', year(number(context.payload.years))],
      ['↗', 'Hasil proyeksi investasi', money(number(context.result.future_value))],
    ],
    durationFrom: context => year(number(context.payload.years)),
    extras: context => <>
      <DataTable caption="Rincian anggaran menikah" data={(context.result.breakdown as Result[]) ?? []}
        columns={[['item', 'Pos biaya', 'text'], ['value', 'Biaya saat ini', 'money']]} />
      {parityNote(context)}
    </>,
  },
  'pendidikan-anak': {
    slug: 'pendidikan-anak',
    title: 'Pendidikan Anak',
    quote: '“Setiap jenjang adalah langkah baru yang bisa disiapkan sejak hari ini.”',
    intro: 'Mulai dari persiapanmu.',
    transition: 'Terima kasih! Selanjutnya, ayo atur strategi investasimu.',
    phase2At: 5,
    options: ['payment', 'duration', 'return'],
    showAllocation: false,
    targetTitle: 'Total biaya pendidikan yang perlu disiapkan',
    exportTitle: 'Pendidikan Anak',
    initialAnswers: () => ({
      child_age: '0', income: '', inflation: '5', education_strategy: 'allIn',
      initial: '0', payment: '1000000', rate: '6',
    }),
    initialExtraState: () => ({ selected: ['sd', 'smp', 'sma', 's1'], education: initialEducation() }),
    onAnswerChange: educationAfterAge,
    questions: [
      { key: 'child_age', label: 'Usia anak sekarang', unit: 'tahun', help: 'Usia menentukan jenjang yang masih bisa dipilih.', min: 0, max: 25 },
      { ...moneyQuestion('income', 'Penghasilan bulanan (opsional)', 'Kosong atau 0 valid. Penghasilan dipakai untuk batas strategi tiap jenjang.'), optional: true },
      percentQuestion('inflation', 'Asumsi inflasi per tahun', 'Inflasi menaikkan biaya pendidikan di masa depan. Isi 0 jika tidak ingin diperhitungkan.'),
      { key: 'education_levels', label: 'Jenjang pendidikan', unit: '', help: 'Pilih rentang jenjang kontinu dan atur biaya tiap jenjang.', optional: true },
      { key: 'education_strategy', label: 'Strategi pendanaan', unit: '', help: 'Tentukan biaya mana yang ingin dicapai dari rencana investasi ini.', options: [['allIn', 'Semua biaya'], ['up', 'Uang pangkal'], ['upSpp', 'Uang pangkal + SPP']] },
      ...phase2,
    ],
    questionView: (key, view) => key === 'education_levels' ? <EducationLevelsView view={view} /> : null,
    extraError: (answers, extra) => ({ education_levels: educationLevelsError(answers, extra) }),
    toPayload: (answers, extra) => ({
      child_age: Number(answers.child_age),
      income: answers.income ? currency(answers.income) : 0,
      inflation: decimalOf(answers.inflation),
      education_strategy: answers.education_strategy,
      levels: educationPayload(extra ?? {}),
      initial: currency(answers.initial), payment: currency(answers.payment),
      rate: decimalOf(answers.rate), child_name: '',
    }),
    metrics: context => [
      ['◈', 'Dana awal', money(number(context.payload.initial))],
      ['+', 'Investasi per bulan', money(number(context.payload.payment))],
      ['%', 'Return asumsi', percent(number(context.payload.rate)) + '/tahun'],
      ['◷', 'Waktu menuju jenjang pertama', year(number((context.result.education_stages as Result[])?.[0]?.years_until_entry))],
      ['↗', 'Hasil proyeksi investasi', money(number(context.result.future_value))],
    ],
    durationFrom: () => '',
    extras: context => {
      const stages = stageRows(context.result);
      const optimized = (context.result.education_stages as Result[]) ?? [];
      return <>
        {stages.length > 0 && <StackedBar parts={stages.map(stage => ({
          label: String(stage.level).toUpperCase(), percent: number(stage.share_percent),
        }))} />}
        <DataTable caption="Rincian biaya pendidikan" data={stages} columns={[
          ['level', 'Jenjang', 'text'], ['years_until_entry', 'Tahun menuju masuk', 'number'],
          ['entrance', 'Uang pangkal', 'money'], ['tuition', 'SPP total', 'money'],
          ['other', 'Biaya lain', 'money'], ['target', 'Target', 'money'],
        ]} />
        {optimized.map(stage => {
          const optimal = recordView(stage.optimal);
          return <section className={css.card} key={String(stage.level)}>
            <h3>Strategi {String(stage.level).toUpperCase()}</h3>
            <p>Setoran <strong>{money(number(optimal.payment))}</strong> · return <strong>{percent(number(optimal.return_percent))}</strong> · proyeksi <strong>{money(number(optimal.future_value))}</strong>.</p>
            <p>{optimal.reaches_target === true ? 'Target jenjang tercapai.' : 'Target jenjang belum tercapai pada batas simulasi.'}</p>
          </section>;
        })}
        <p className={css.note}>Model arsip memakai ulang modal awal tiap jenjang tanpa mengurangi penarikan. Optimizer dapat melampaui batas rasio tabungan satu langkah.</p>
      </>;
    },
    downloadName: { label: 'Nama anak (opsional)', key: 'child_name' },
  },
  'simulasi-kpr': {
    slug: 'simulasi-kpr',
    title: 'Simulasi KPR',
    quote: '“Pahami cicilan hari ini sebelum mengambil keputusan besok.”',
    intro: 'Mulai dari persiapanmu.',
    transition: '',
    phase2At: Number.MAX_SAFE_INTEGER,
    tabs: ['Ringkasan', 'Biaya Transaksi', 'Download'],
    options: [],
    showAllocation: false,
    targetTitle: '',
    exportTitle: 'Simulasi KPR',
    initialAnswers: () => {
      const values: Answers = {
        price: '', dp: '', years: '', rate: '',
        fixed_months: '', floating: '', income: '', njop: '',
      };
      const params = new URLSearchParams(typeof location === 'undefined' ? '' : location.search);
      for (const [key, max] of [['price', 1e15], ['dp', 100]] as const) {
        const raw = params.get(key);
        if (raw && /^\d+(\.\d+)?$/.test(raw) && Number(raw) <= max) values[key] = raw;
      }
      return values;
    },
    questions: [
      moneyQuestion('price', 'Harga properti', 'Masukkan harga properti yang ingin kamu beli.', 1),
      { key: 'dp', label: 'Uang muka (DP)', unit: '%', help: 'Isi 0 jika belum menyiapkan DP.', min: 0, max: 100 },
      { key: 'years', label: 'Tenor pinjaman', unit: 'tahun', help: 'Boleh isi pecahan tahun, misalnya 10,5 tahun.', min: 1 / 12, max: 100, integer: false },
      percentQuestion('rate', 'Bunga fix per tahun', 'Bunga fix dipakai selama masa bunga tetap.'),
      { key: 'fixed_months', label: 'Lama bunga fix', unit: 'bulan', help: 'Isi 0 jika tidak ada masa bunga tetap.', min: 0, max: 1200 },
      percentQuestion('floating', 'Bunga floating per tahun', 'Bunga floating dipakai setelah masa bunga fix berakhir.'),
      { ...moneyQuestion('income', 'Penghasilan bulanan (opsional)', 'Kosong atau 0 valid. Dipakai untuk menilai kelayakan cicilan.'), optional: true },
      { ...moneyQuestion('njop', 'NJOP-TKP (opsional)', 'Kosong atau 0 valid. Dipakai untuk menghitung BPHTB.'), optional: true },
    ],
    questionExtra: (key, view) => key === 'dp' ? <KprPrincipalNote view={view} /> : null,
    toPayload: answers => ({
      price: currency(answers.price), dp: decimalOf(answers.dp),
      years: decimalOf(answers.years), rate: decimalOf(answers.rate),
      fixed_months: Number(answers.fixed_months), floating: decimalOf(answers.floating),
      income: answers.income ? currency(answers.income) : 0,
      njop: answers.njop ? currency(answers.njop) : 0,
      dream_name: '',
    }),
    metrics: () => [],
    durationFrom: () => '',
    resultsView: ({ result, tab }) => <KprResults result={result} tab={tab} />,
  },
};

const recordView = (value: unknown): Result =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Result : {};

export function getSpec(slug: CalculatorSlug) {
  const spec = specs[slug];
  if (!spec) throw new Error('Kalkulator ini belum memakai pola percakapan.');
  return spec;
}
