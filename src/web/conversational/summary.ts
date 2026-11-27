import { resetEducationSelection } from "../../domain/calculators/education";
import { pythonRound } from "../../domain/calculators/math";
import type { CalculatorSlug, EducationLevel } from "../../domain/calculators/types";
import { money, percent } from "../config";
import { answerError, decimal, parseRupiah, type Answers, type Question } from "./answers";
import {
  educationLevelsError,
  initialEducation,
  weddingBudgetError,
  weddingGroups,
  weddingItems,
  type EducationState,
} from "./structured";

export type GuideStep = { title: string; body: string };

type GuideConfig = {
  lead: string;
  steps: readonly [GuideStep, GuideStep, GuideStep];
  emptySummary: string;
};

const guides: Record<CalculatorSlug, GuideConfig> = {
  annuity: {
    lead: "Atur target investasimu secara bertahap sesuai frekuensi dan waktu setoran yang nyaman.",
    steps: [
      { title: "Tentukan jadwal", body: "Pilih frekuensi bulanan atau tahunan serta waktu setoran." },
      { title: "Isi target & strategi", body: "Masukkan durasi, target dana, saldo awal, setoran, dan return." },
      { title: "Lihat hasilnya", body: "Bandingkan proyeksi dengan opsi Nominal, Durasi, dan Return." },
    ],
    emptySummary: "Isi target dana pada langkah ke-4 untuk melihat ringkasan dan progres dana awalmu.",
  },
  properti: {
    lead: "Pisahkan target uang muka dari cicilan agar persiapan membeli rumah tetap terukur.",
    steps: [
      { title: "Tetapkan target DP", body: "Isi harga properti, persentase DP, waktu, inflasi, dan kebijakan rumus." },
      { title: "Atur strategi setor", body: "Masukkan dana awal, setoran bulanan, dan asumsi return tahunan." },
      { title: "Lanjut ke KPR", body: "Tinjau hasil strategi, lalu teruskan harga dan DP ke Simulasi KPR." },
    ],
    emptySummary: "Isi harga properti dan persentase DP untuk melihat estimasi target uang muka.",
  },
  kendaraan: {
    lead: "Hitung uang muka kendaraan incaran agar pembelian berikutnya tidak membebani arus kas.",
    steps: [
      { title: "Tentukan kendaraan", body: "Isi harga kendaraan, persentase DP, durasi, inflasi, dan kebijakan rumus." },
      { title: "Atur strategi setor", body: "Masukkan dana awal, setoran bulanan, dan asumsi return tahunan." },
      { title: "Lihat rekomendasinya", body: "Bandingkan hasil strategi dengan opsi Nominal, Durasi, dan Return." },
    ],
    emptySummary: "Isi harga kendaraan dan persentase DP untuk melihat estimasi uang muka yang dibutuhkan.",
  },
  barang: {
    lead: "Ubah keinginan membeli barang menjadi target menabung bulanan dengan tenggat yang jelas.",
    steps: [
      { title: "Tentukan target barang", body: "Isi harga barang, bagian yang disiapkan, durasi bulan, dan inflasi." },
      { title: "Atur setoran rutin", body: "Masukkan dana awal, setoran bulanan, dan asumsi return tahunan." },
      { title: "Tinjau opsi hasil", body: "Cek strategi serta perbandingan inflasi bertahap dan unduh PNG." },
    ],
    emptySummary: "Isi harga barang dan bagian yang disiapkan untuk melihat estimasi target danamu.",
  },
  "dana-pensiun": {
    lead: "Proyeksikan dana hidup mandiri di masa pensiun berdasarkan pengeluaran bulanan saat ini.",
    steps: [
      { title: "Petakan waktu pensiun", body: "Isi usia sekarang, usia target pensiun, pengeluaran bulanan, dan inflasi." },
      { title: "Atur strategi pensiun", body: "Masukkan dana pensiun awal, setoran bulanan, dan asumsi return." },
      { title: "Tinjau hasilnya", body: "Lihat target 25× pengeluaran tahunan terinflasi serta 3 opsi penyesuaian." },
    ],
    emptySummary: "Isi usia sekarang, usia pensiun, pengeluaran bulanan, dan inflasi untuk melihat estimasi target.",
  },
  menikah: {
    lead: "Susun anggaran acara pernikahan secara total atau rinci tiap pos agar persiapan tetap tenang.",
    steps: [
      { title: "Pilih mode biaya", body: "Tentukan durasi, inflasi, lalu isi total anggaran atau 13 pos rincian." },
      { title: "Pilih kebijakan & setor", body: "Tentukan kebijakan rumus, dana awal, setoran bulanan, dan return." },
      { title: "Review & bagikan", body: "Tinjau rincian biaya, rekomendasi penyesuaian, dan ekspor PNG." },
    ],
    emptySummary: "Isi anggaran pernikahan (total atau rincian 13 pos) untuk melihat estimasi target.",
  },
  "pendidikan-anak": {
    lead: "Hitung biaya masuk hingga SPP tiap jenjang sekolah anak sambil menyesuaikan preset biaya.",
    steps: [
      { title: "Pilih jenjang aktif", body: "Isi usia anak, penghasilan opsional, inflasi, dan rentang jenjang kontinu." },
      { title: "Atur strategi dana", body: "Pilih cakupan biaya serta dana awal, setoran bulanan, dan asumsi return." },
      { title: "Tinjau tiap jenjang", body: "Lihat proporsi biaya per jenjang, optimizer, dan ekspor PNG." },
    ],
    emptySummary: "Isi usia anak, inflasi, dan pilih minimal satu jenjang aktif untuk melihat total biaya.",
  },
  "simulasi-kpr": {
    lead: "Pahami perubahan cicilan dari masa bunga fix ke floating beserta biaya transaksi di awal.",
    steps: [
      { title: "Tentukan pinjaman", body: "Isi harga properti, persentase DP, dan tenor pinjaman dalam tahun." },
      { title: "Atur bunga & masa fix", body: "Masukkan bunga fix, lama masa fix (bulan), dan bunga floating." },
      { title: "Cek kelayakan & biaya", body: "Tambahkan penghasilan & NJOP-TKP opsional lalu buka simulasi lengkap." },
    ],
    emptySummary: "Isi harga properti dan persentase uang muka (DP) untuk melihat pokok pinjaman awal.",
  },
  "dana-darurat": {
    lead: "Kalkulator ini mengikuti ceritamu. Isi angka yang kamu tahu dulu; kamu bisa mengubahnya kapan saja.",
    steps: [
      { title: "Tentukan tujuan", body: "Hitung pengeluaran wajib, status pernikahan, dan tanggungan." },
      { title: "Isi rencanamu", body: "Sesuaikan durasi, dana saat ini, setoran, dan asumsi return." },
      { title: "Lihat hasilnya", body: "Tinjau strategi, rekomendasi, dan unduh lembar PNG bila perlu." },
    ],
    emptySummary: "Isi pengeluaran wajib bulanan untuk melihat ringkasan target dana darurat.",
  },
};

export function guideStepsFor(slug: CalculatorSlug): GuideConfig {
  return guides[slug];
}

export type CalculatorSummary = {
  heading: string;
  label: string;
  value: number;
  note: string;
  hasCurrent: boolean;
  current: number | null;
  shortfall: number | null;
  progressPercent: number;
  extraRows?: readonly (readonly [string, string])[];
};

const initialQuestion: Question = {
  key: "initial",
  label: "Dana awal",
  unit: "Rp",
  help: "",
  min: 0,
  max: 1e15,
};

const priceQuestion: Question = { key: "price", label: "", unit: "Rp", help: "", min: 1, max: 1e15 };
const dpQuestion: Question = { key: "dp", label: "", unit: "%", help: "", min: 0, max: 100, integer: false };
const yearsQuestion: Question = { key: "years", label: "", unit: "tahun", help: "", min: 1 / 12, max: 100, integer: false };
const monthsQuestion: Question = { key: "months", label: "", unit: "bulan", help: "", min: 1, max: 1200, integer: true };
const inflationQuestion: Question = { key: "inflation", label: "", unit: "%/tahun", help: "", min: 0, max: 100, integer: false };
const targetQuestion: Question = { key: "target", label: "", unit: "Rp", help: "", min: 1, max: 1e15 };
const ageQuestion: Question = { key: "age", label: "", unit: "tahun", help: "", min: 0, max: 99, integer: true };
const retirementQuestion: Question = {
  key: "retirement_age",
  label: "",
  unit: "tahun",
  help: "",
  min: 1,
  max: 100,
  integer: true,
  validate: (value, answers) =>
    answers.age && Number(value) <= Number(answers.age) ? "invalid" : "",
};
const expenseQuestion: Question = { key: "expense", label: "", unit: "Rp", help: "", min: 1, max: 1e15 };
const childAgeQuestion: Question = { key: "child_age", label: "", unit: "tahun", help: "", min: 0, max: 25, integer: true };
const rateQuestion: Question = { key: "rate", label: "", unit: "%/tahun", help: "", min: 0, max: 100, integer: false };
const fixedMonthsQuestion: Question = { key: "fixed_months", label: "", unit: "bulan", help: "", min: 0, max: 1200, integer: true };
const floatingQuestion: Question = { key: "floating", label: "", unit: "%/tahun", help: "", min: 0, max: 100, integer: false };

const LEVELS: Record<EducationLevel, readonly [number, number]> = {
  sd: [6, 6],
  smp: [12, 3],
  sma: [15, 3],
  s1: [18, 4],
};

function withCurrentProgress(
  base: Omit<CalculatorSummary, "hasCurrent" | "current" | "shortfall" | "progressPercent">,
  answers: Answers,
): CalculatorSummary | null {
  if (!Number.isFinite(base.value) || base.value < 0) return null;
  const rawInitial = answers.initial ?? "";
  const hasCurrent = rawInitial !== "" && !answerError(initialQuestion, rawInitial, answers);
  if (!hasCurrent) {
    return {
      ...base,
      hasCurrent: false,
      current: null,
      shortfall: null,
      progressPercent: 0,
    };
  }
  const current = parseRupiah(rawInitial);
  const shortfall = Math.max(0, base.value - current);
  const progressPercent = base.value > 0 ? Math.min(100, (current / base.value) * 100) : 100;
  return {
    ...base,
    hasCurrent: true,
    current,
    shortfall,
    progressPercent,
  };
}

export function computeCalculatorSummary(
  slug: CalculatorSlug,
  answers: Answers,
  extra: Record<string, unknown> = {},
): CalculatorSummary | null {
  if (slug === "annuity") {
    if (answerError(targetQuestion, answers.target ?? "", answers)) return null;
    const target = parseRupiah(answers.target ?? "");
    const freq = answers.frequency === "yearly" ? "Tahunan" : "Bulanan";
    const timing = answers.timing === "end" ? "Akhir periode" : "Awal periode";
    const extraRows: [string, string][] = [["Frekuensi", freq], ["Waktu setor", timing]];
    if (!answerError(yearsQuestion, answers.years ?? "", answers)) {
      extraRows.push(["Durasi", `${decimal(answers.years).toLocaleString("id-ID")} tahun`]);
    }
    return withCurrentProgress(
      {
        heading: "Ringkasan Target",
        label: "Target dana investasi",
        value: target,
        note: `${freq} · ${timing}`,
        extraRows,
      },
      answers,
    );
  }

  if (slug === "properti" || slug === "kendaraan") {
    if (
      answerError(priceQuestion, answers.price ?? "", answers) ||
      answerError(dpQuestion, answers.dp ?? "", answers)
    ) {
      return null;
    }
    const price = parseRupiah(answers.price ?? "");
    const dp = decimal(answers.dp ?? "");
    const base = (price * dp) / 100;
    const hasGrowth =
      !answerError(yearsQuestion, answers.years ?? "", answers) &&
      !answerError(inflationQuestion, answers.inflation ?? "", answers);
    const years = hasGrowth ? decimal(answers.years ?? "") : 0;
    const inflation = hasGrowth ? decimal(answers.inflation ?? "") / 100 : 0;
    const value = hasGrowth ? base * (1 + inflation) ** years : base;
    return withCurrentProgress(
      {
        heading: "Ringkasan Target",
        label: hasGrowth ? "Estimasi target DP terinflasi" : "DP harga saat ini",
        value,
        note: `${percent(dp)} dari harga ${money(price)}`,
        extraRows: hasGrowth ? [["DP harga saat ini", money(base)]] : undefined,
      },
      answers,
    );
  }

  if (slug === "barang") {
    if (
      answerError(priceQuestion, answers.price ?? "", answers) ||
      answerError(dpQuestion, answers.dp ?? "", answers)
    ) {
      return null;
    }
    const price = parseRupiah(answers.price ?? "");
    const dp = decimal(answers.dp ?? "");
    const base = (price * dp) / 100;
    const hasGrowth =
      !answerError(monthsQuestion, answers.months ?? "", answers) &&
      !answerError(inflationQuestion, answers.inflation ?? "", answers);
    const years = hasGrowth ? Number(answers.months ?? "") / 12 : 0;
    const inflation = hasGrowth ? decimal(answers.inflation ?? "") / 100 : 0;
    const value = hasGrowth ? base * (1 + inflation) ** years : base;
    return withCurrentProgress(
      {
        heading: "Ringkasan Target",
        label: hasGrowth ? "Estimasi target terinflasi" : "Bagian harga saat ini",
        value,
        note: `${percent(dp)} dari harga ${money(price)}`,
        extraRows: hasGrowth ? [["Bagian harga saat ini", money(base)]] : undefined,
      },
      answers,
    );
  }

  if (slug === "dana-pensiun") {
    if (
      answerError(ageQuestion, answers.age ?? "", answers) ||
      answerError(retirementQuestion, answers.retirement_age ?? "", answers) ||
      answerError(expenseQuestion, answers.expense ?? "", answers) ||
      answerError(inflationQuestion, answers.inflation ?? "", answers)
    ) {
      return null;
    }
    const age = Number(answers.age);
    const retirementAge = Number(answers.retirement_age);
    const years = retirementAge - age;
    const expense = parseRupiah(answers.expense);
    const inflation = decimal(answers.inflation) / 100;
    const target = (expense * 12 * (1 + inflation) ** years) / 0.04;
    return withCurrentProgress(
      {
        heading: "Ringkasan Target",
        label: "Dana pensiun yang dibutuhkan",
        value: target,
        note: `${years.toLocaleString("id-ID")} tahun menuju pensiun · aturan 4% (25×)`,
        extraRows: [["Pengeluaran tahunan kini", money(expense * 12)]],
      },
      answers,
    );
  }

  if (slug === "menikah") {
    if (weddingBudgetError(answers)) return null;
    const base =
      answers.wedding_mode === "detailed"
        ? weddingItems.reduce((sum, [key]) => sum + (parseRupiah(answers[key] ?? "") || 0), 0) +
          weddingGroups.reduce(
            (sum, [key]) =>
              sum +
              (Number(answers["count_" + key] ?? 0) || 0) *
                (parseRupiah(answers["price_" + key] ?? "") || 0),
            0,
          )
        : parseRupiah(answers.budget ?? "");
    if (!Number.isFinite(base)) return null;
    const hasGrowth =
      !answerError(yearsQuestion, answers.years ?? "", answers) &&
      !answerError(inflationQuestion, answers.inflation ?? "", answers);
    const years = hasGrowth ? decimal(answers.years ?? "") : 0;
    const inflation = hasGrowth ? decimal(answers.inflation ?? "") / 100 : 0;
    const value = hasGrowth ? base * (1 + inflation) ** years : base;
    return withCurrentProgress(
      {
        heading: "Ringkasan Target",
        label: hasGrowth ? "Estimasi anggaran terinflasi" : "Anggaran saat ini",
        value,
        note: answers.wedding_mode === "detailed" ? "Mode rincian 13 pos biaya" : "Mode total anggaran",
        extraRows: hasGrowth ? [["Anggaran harga saat ini", money(base)]] : undefined,
      },
      answers,
    );
  }

  if (slug === "pendidikan-anak") {
    if (
      answerError(childAgeQuestion, answers.child_age ?? "", answers) ||
      answerError(inflationQuestion, answers.inflation ?? "", answers) ||
      educationLevelsError(answers, extra)
    ) {
      return null;
    }
    const age = Number(answers.child_age);
    const inflation = decimal(answers.inflation) / 100;
    const rawSelected = (extra.selected as EducationLevel[]) ?? [];
    const selected = resetEducationSelection(age, rawSelected);
    const education =
      (extra.education as Record<EducationLevel, EducationState>) ?? initialEducation();
    if (!selected.length) return null;

    let total = 0;
    for (const level of selected) {
      const state = education[level];
      if (!state) return null;
      const [entry, duration] = LEVELS[level];
      const wait = entry - age;
      const factor = (1 + inflation) ** wait;
      const multiplier = Number(state.multiplier) || (level === "s1" ? 2 : 12);
      const entrance = (parseRupiah(state.entrance) || 0) * factor;
      const tuition = (parseRupiah(state.tuition) || 0) * multiplier * duration * factor;
      const other = ((entrance + tuition) * (decimal(state.other_percent) || 0)) / 100;
      const stageTarget = pythonRound(entrance + tuition + other, 1);
      total += Math.trunc(stageTarget);
    }

    const strategyLabels: Record<string, string> = {
      allIn: "Semua biaya",
      up: "Uang pangkal",
      upSpp: "Uang pangkal + SPP",
    };

    return withCurrentProgress(
      {
        heading: "Ringkasan Target",
        label: "Total estimasi biaya pendidikan",
        value: total,
        note: `${selected.map((s) => s.toUpperCase()).join(" · ")} · ${strategyLabels[answers.education_strategy ?? "allIn"] ?? "Semua biaya"}`,
      },
      answers,
    );
  }

  if (slug === "simulasi-kpr") {
    if (
      answerError(priceQuestion, answers.price ?? "", answers) ||
      answerError(dpQuestion, answers.dp ?? "", answers)
    ) {
      return null;
    }
    const price = parseRupiah(answers.price ?? "");
    const dp = decimal(answers.dp ?? "");
    const dpAmount = (price * dp) / 100;
    const principal = price - dpAmount;
    const extraRows: [string, string][] = [
      ["Harga properti", money(price)],
      ["Uang muka (DP)", `${money(dpAmount)} (${percent(dp)})`],
    ];
    if (!answerError(yearsQuestion, answers.years ?? "", answers)) {
      extraRows.push(["Tenor pinjaman", `${decimal(answers.years).toLocaleString("id-ID")} tahun`]);
    }
    if (!answerError(rateQuestion, answers.rate ?? "", answers)) {
      extraRows.push(["Bunga fix", `${percent(decimal(answers.rate))}/tahun`]);
    }
    if (!answerError(fixedMonthsQuestion, answers.fixed_months ?? "", answers)) {
      extraRows.push(["Lama bunga fix", `${Number(answers.fixed_months).toLocaleString("id-ID")} bulan`]);
    }
    if (!answerError(floatingQuestion, answers.floating ?? "", answers)) {
      extraRows.push(["Bunga floating", `${percent(decimal(answers.floating))}/tahun`]);
    }
    return {
      heading: "Ringkasan Pinjaman",
      label: "Pokok pinjaman awal",
      value: principal,
      note: `DP ${percent(dp)} dari harga ${money(price)}`,
      hasCurrent: false,
      current: null,
      shortfall: null,
      progressPercent: 0,
      extraRows,
    };
  }

  return null;
}
