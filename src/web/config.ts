import type { CalculatorSlug } from "../domain/calculators/types";
export const calculators: Record<
  CalculatorSlug,
  { title: string; description: string; icon: string; fields: string[] }
> = {
  "pendidikan-anak": {
    title: "Pendidikan Anak",
    description: "Dari hari pertama sekolah hingga gelar sarjana.",
    icon: "M3 9 12 4 21 9 12 14Z M6 11v7l6 3 6-3v-7",
    fields: ["child_age", "income", "inflation"],
  },
  "simulasi-kpr": {
    title: "Simulasi KPR",
    description: "Kenali cicilan, bunga, dan ruang dalam penghasilan.",
    icon: "M3 11 12 3 21 11 M5 10v11h14V10 M10 21v-7h4v7",
    fields: [
      "years",
      "price",
      "dp",
      "rate",
      "fixed_months",
      "floating",
      "income",
      "njop",
    ],
  },
  annuity: {
    title: "Kalkulator Investasi",
    description: "Lihat bagaimana kebiasaan kecil tumbuh dari waktu ke waktu.",
    icon: "M3 20V4 M3 20h18 M6 15l5-5 4 3 6-8",
    fields: ["years", "target", "frequency", "timing"],
  },
  "dana-darurat": {
    title: "Dana Darurat",
    description: "Siapkan bantalan untuk hal yang tak direncanakan.",
    icon: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M6 6l4 4 M14 14l4 4 M6 18l4-4 M14 10l4-4",
    fields: ["years", "expense", "married", "dependents"],
  },
  properti: {
    title: "DP Properti",
    description: "Mulai langkah menuju tempat yang kamu sebut rumah.",
    icon: "M3 11 12 3 21 11 M5 10v11h14V10 M8 15h8 M12 12v6",
    fields: ["years", "price", "dp", "inflation", "formula_policy"],
  },
  menikah: {
    title: "Menikah",
    description: "Rencanakan hari istimewa dengan anggaran yang masuk akal.",
    icon: "M9 9a6 6 0 1 0 6 0 M9 6l3-3 3 3-3 4Z",
    fields: ["years", "inflation", "formula_policy"],
  },
  "dana-pensiun": {
    title: "Dana Pensiun",
    description: "Beri dirimu lebih banyak pilihan di masa depan.",
    icon: "M4 21h16 M12 21V7 M3 9q9-14 18 0 M3 9q9-5 18 0",
    fields: ["age", "retirement_age", "expense", "inflation"],
  },
  kendaraan: {
    title: "Kendaraan",
    description: "Hitung persiapan untuk perjalanan berikutnya.",
    icon: "M3 17V9l3-5h12l3 5v8Z M3 10h18 M6 17v3 M18 17v3 M6 13h2 M16 13h2",
    fields: ["years", "price", "dp", "inflation", "formula_policy"],
  },
  barang: {
    title: "Barang",
    description: "Wujudkan pembelian impian tanpa kehilangan arah.",
    icon: "M3 8h18v13H3Z M2 8h20V4H2Z M12 4v17",
    fields: ["years", "price", "dp", "inflation"],
  },
};
export interface FieldDefinition {
  label: string;
  value: number;
  max: number;
  money?: boolean;
  optional?: boolean;
  min?: number;
  integer?: boolean;
}
export const fields: Record<string, FieldDefinition> = {
  years: {
    label: "Waktu menuju target (tahun)",
    value: 5,
    max: 100,
    min: 1 / 12,
  },
  price: { label: "Harga saat ini", value: 5e8, max: 1e15, money: true },
  dp: { label: "Bagian harga yang disiapkan / DP (%)", value: 30, max: 100 },
  inflation: { label: "Inflasi per tahun (%)", value: 5, max: 100 },
  rate: { label: "Return / bunga per tahun (%)", value: 6, max: 100 },
  initial: { label: "Dana awal", value: 0, max: 1e15, money: true },
  payment: {
    label: "Investasi rutin per periode",
    value: 1e6,
    max: 1e15,
    money: true,
  },
  target: { label: "Target dana", value: 1e8, max: 1e15, money: true },
  expense: {
    label: "Pengeluaran wajib per bulan",
    value: 5e6,
    max: 1e15,
    money: true,
  },
  dependents: { label: "Jumlah tanggungan", value: 0, max: 100, integer: true },
  fixed_months: {
    label: "Lama bunga fix (bulan)",
    value: 36,
    max: 1200,
    integer: true,
  },
  floating: { label: "Bunga floating per tahun (%)", value: 10, max: 100 },
  child_age: { label: "Usia anak sekarang (tahun)", value: 0, max: 25 },
  income: {
    label: "Penghasilan per bulan (opsional)",
    value: 0,
    max: 1e15,
    money: true,
    optional: true,
  },
  njop: {
    label: "NJOP-TKP (opsional)",
    value: 0,
    max: 1e15,
    money: true,
    optional: true,
  },
  age: { label: "Usia sekarang (tahun)", value: 30, max: 100 },
  retirement_age: { label: "Usia pensiun (tahun)", value: 55, max: 100 },
};
export const choices: Record<
  string,
  { label: string; value: string; options: [string, string][] }
> = {
  frequency: {
    label: "Periode investasi",
    value: "monthly",
    options: [
      ["monthly", "Bulanan"],
      ["yearly", "Tahunan"],
    ],
  },
  timing: {
    label: "Waktu setoran",
    value: "beginning",
    options: [
      ["beginning", "Awal periode"],
      ["end", "Akhir periode"],
    ],
  },
  married: {
    label: "Status keluarga",
    value: "false",
    options: [
      ["false", "Belum menikah"],
      ["true", "Menikah"],
    ],
  },
  formula_policy: {
    label: "Kebijakan rumus nominal",
    value: "corrected",
    options: [
      ["corrected", "Terkoreksi — return input"],
      ["archive", "Arsip — durasi sebagai return"],
    ],
  },
};
export const money = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
export const percent = (n: number) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(n) + "%";
