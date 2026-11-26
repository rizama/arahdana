export type Answers = Record<string, string>;
export type Question = {
  key: string;
  label: string;
  unit: string;
  help: string;
  min?: number;
  max?: number;
  options?: readonly (readonly [string, string])[];
  optional?: boolean;
  integer?: boolean;
  labelOf?: (answers: Answers) => string;
  noteOf?: (answers: Answers) => string;
  validate?: (value: string, answers: Answers) => string;
};

export const rupiahDigits = (value: string) => value.replace(/[^0-9]/g, '');
export const formatRupiah = (value: string) => rupiahDigits(value).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
export function parseRupiah(value: string) {
  const digits = rupiahDigits(value);
  return digits ? Number(digits) : NaN;
}
export const decimal = (value: string) => Number(value.replace(',', '.'));

export function answerError(question: Question, value: string, answers: Answers = {}) {
  const { key, unit, options, min = 0, max = Number.MAX_SAFE_INTEGER } = question;
  if (!value) {
    if (question.optional) return '';
    return options ? 'Pilih salah satu opsi.' : key === 'married' ? 'Pilih Sudah atau Belum.' : 'Isi jawaban ini.';
  }
  if (options) return options.some(([option]) => option === value) ? '' : 'Pilih salah satu opsi.';
  const isMoney = unit === 'Rp';
  const isRate = unit.includes('%');
  const integer = question.integer ?? !isRate;
  const pattern = integer ? /^\d+$/ : /^(?:\d+(?:[.,]\d+)?|[.,]\d+)$/;
  const number = isMoney ? parseRupiah(value) : decimal(value);
  if ((!isMoney && !pattern.test(value)) || !Number.isFinite(number) || number < min || number > max) {
    if (key === 'expense') return 'Masukkan pengeluaran Rp1–Rp1.000.000.000.000.000.';
    if (isMoney) return 'Masukkan nominal Rp0–Rp1.000.000.000.000.000.';
    return isRate ? 'Masukkan persentase 0–100.' : `Masukkan bilangan ${integer ? 'bulat ' : ''}${min}–${max} ${unit}.`;
  }
  return question.validate?.(value, answers) ?? '';
}

export function emptyAnswersFor(questions: readonly Question[]): Answers {
  return Object.fromEntries(questions.map(question => [question.key, '']));
}

export function furthestStep(questions: readonly Question[], answers: Answers, previous: number) {
  const firstInvalid = questions.findIndex(question => answerError(question, answers[question.key] ?? '', answers));
  return Math.max(previous, firstInvalid < 0 ? questions.length - 1 : firstInvalid);
}
