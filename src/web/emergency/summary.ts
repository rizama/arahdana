import { answerError, parseRupiah, type Answers, type Question } from "../conversational/answers";

export const EMERGENCY_INSTRUMENTS = [
  "Deposito",
  "Emas",
  "US Dollar",
  "Reksadana Pasar Uang",
  "Reksadana Pendapatan Tetap Tertentu",
] as const;

export function emergencyMultiplier(married: boolean, dependents: number): number {
  return Math.min(15, (married ? 9 : 6) + 3 * dependents);
}

const expenseQuestion: Question = {
  key: "expense",
  label: "Pengeluaran wajib per bulan",
  unit: "Rp",
  help: "",
  min: 1,
  max: 1e15,
};
const marriedQuestion: Question = {
  key: "married",
  label: "Apakah kamu sudah menikah?",
  unit: "",
  help: "",
  options: [
    ["true", "Sudah"],
    ["false", "Belum"],
  ],
};
const dependentsQuestion: Question = {
  key: "dependents",
  label: "Jumlah tanggungan",
  unit: "orang",
  help: "",
  min: 0,
  max: 100,
};
const initialQuestion: Question = {
  key: "initial",
  label: "Dana darurat saat ini",
  unit: "Rp",
  help: "",
  min: 0,
  max: 1e15,
};

export type EmergencySummary = {
  expense: number;
  married: boolean;
  dependents: number;
  multiplier: number;
  target: number;
  liquidAllocation: number;
  investAllocation: number;
  hasCurrent: boolean;
  current: number | null;
  shortfall: number | null;
  surplus: number | null;
  progressPercent: number;
};

export function computeEmergencySummary(answers: Answers): EmergencySummary | null {
  if (
    answerError(expenseQuestion, answers.expense ?? "", answers) ||
    answerError(marriedQuestion, answers.married ?? "", answers) ||
    answerError(dependentsQuestion, answers.dependents ?? "", answers)
  ) {
    return null;
  }
  const expense = parseRupiah(answers.expense ?? "");
  const married = answers.married === "true";
  const dependents = Number(answers.dependents ?? "0");
  const multiplier = emergencyMultiplier(married, dependents);
  const target = expense * multiplier;
  const liquidAllocation = target * 0.5;
  const investAllocation = target * 0.5;

  const rawInitial = answers.initial ?? "";
  const hasCurrent =
    rawInitial !== "" && !answerError(initialQuestion, rawInitial, answers);

  if (!hasCurrent) {
    return {
      expense,
      married,
      dependents,
      multiplier,
      target,
      liquidAllocation,
      investAllocation,
      hasCurrent: false,
      current: null,
      shortfall: null,
      surplus: null,
      progressPercent: 0,
    };
  }

  const current = parseRupiah(rawInitial);
  const shortfall = Math.max(0, target - current);
  const surplus = Math.max(0, current - target);
  const progressPercent = target > 0 ? Math.min(100, (current / target) * 100) : 100;

  return {
    expense,
    married,
    dependents,
    multiplier,
    target,
    liquidAllocation,
    investAllocation,
    hasCurrent: true,
    current,
    shortfall,
    surplus,
    progressPercent,
  };
}
