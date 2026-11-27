import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { calculate } from "../../src/domain/calculators/calculators";
import type { CalculatorSlug, Result } from "../../src/domain/calculators/types";
import { BinderShell } from "../../src/web/binder/BinderShell";
import { calculators, money } from "../../src/web/config";
import type { Answers } from "../../src/web/conversational/answers";
import { ConversationalForm } from "../../src/web/conversational/Form";
import { ResultSheet } from "../../src/web/conversational/ResultSheet";
import { ConversationalResults } from "../../src/web/conversational/Results";
import { getSpec } from "../../src/web/conversational/specs";
import { computeCalculatorSummary } from "../../src/web/conversational/summary";

const eightSlugs: readonly CalculatorSlug[] = [
  "annuity",
  "properti",
  "kendaraan",
  "barang",
  "dana-pensiun",
  "menikah",
  "pendidikan-anak",
  "simulasi-kpr",
];

const validSamples: Record<Exclude<CalculatorSlug, "dana-darurat">, Answers> = {
  annuity: {
    frequency: "monthly",
    timing: "beginning",
    years: "5",
    target: "100000000",
    initial: "10000000",
    payment: "1000000",
    rate: "6",
  },
  properti: {
    price: "500000000",
    dp: "20",
    years: "5",
    inflation: "5",
    formula_policy: "corrected",
    initial: "15000000",
    payment: "1000000",
    rate: "6",
  },
  kendaraan: {
    price: "200000000",
    dp: "20",
    years: "5",
    inflation: "5",
    formula_policy: "corrected",
    initial: "5000000",
    payment: "1000000",
    rate: "6",
  },
  barang: {
    price: "10000000",
    dp: "100",
    months: "24",
    inflation: "5",
    initial: "500000",
    payment: "300000",
    rate: "6",
  },
  "dana-pensiun": {
    age: "30",
    retirement_age: "55",
    expense: "5000000",
    inflation: "5",
    initial: "20000000",
    payment: "1000000",
    rate: "6",
  },
  menikah: {
    years: "2",
    inflation: "5",
    wedding_mode: "simple",
    budget: "100000000",
    formula_policy: "corrected",
    initial: "10000000",
    payment: "2000000",
    rate: "6",
  },
  "pendidikan-anak": {
    child_age: "0",
    income: "",
    inflation: "5",
    education_strategy: "allIn",
    initial: "5000000",
    payment: "1000000",
    rate: "6",
  },
  "simulasi-kpr": {
    price: "500000000",
    dp: "20",
    years: "15",
    rate: "6",
    fixed_months: "36",
    floating: "10",
    income: "20000000",
    njop: "0",
  },
};

describe("T-BINDER-05 — BinderShell untuk 8 kalkulator selain Dana Darurat", () => {
  it.each(eightSlugs)("merender header tab aktif dan footer ringkas untuk /%s", (slug) => {
    const html = renderToStaticMarkup(
      <BinderShell route={slug} dark={false} onToggleTheme={() => {}}>
        <div>Konten {slug}</div>
      </BinderShell>,
    );
    expect(html).toContain(`href="/${slug}"`);
    expect(html).toContain('aria-current="page"');
    expect(html).toContain(calculators[slug].title);
    expect(html).not.toContain("Dana Darurat");
    expect(html).toContain("← Beranda");
    expect(html).toContain('href="/#pilih-tujuan"');
    expect(html).not.toContain("Jaminan Arsip");
    expect(html).not.toContain("style=");
    expect(html).not.toContain("animate-pulse");
  });
});

describe("T-BINDER-06 — Form Binder dan live summary 8 kalkulator", () => {
  it.each(eightSlugs)("merender form dua kolom Binder dan panduan untuk /%s", (slug) => {
    const html = renderToStaticMarkup(<ConversationalForm slug={slug} />);
    expect(html).toContain("Begini alurnya");
    expect(html).toContain(
      slug === "simulasi-kpr" ? "Ringkasan Pinjaman" : "Ringkasan Target",
    );
    expect(html).toContain("Mulai dari persiapanmu.");
    expect(html).toContain('aria-label="Informasi:');
    expect(html).not.toContain("style=");
    expect(html).not.toContain("NaN");
  });

  it.each(eightSlugs)("menghitung live summary konsisten dengan domain untuk /%s", (slug) => {
    const spec = getSpec(slug);
    const answers = validSamples[slug as Exclude<CalculatorSlug, "dana-darurat">];
    const extra = spec.initialExtraState?.() ?? {};
    const payload = spec.toPayload(answers, extra);
    const result = calculate(slug, payload);
    const summary = computeCalculatorSummary(slug, answers, extra);

    expect(summary).not.toBeNull();
    const expected =
      slug === "simulasi-kpr"
        ? (result.principal as number)
        : (result.target as number);
    expect(summary!.value).toBeCloseTo(expected, 1);

    const emptySummary = computeCalculatorSummary(slug, {}, extra);
    if (slug !== "pendidikan-anak") {
      expect(emptySummary).toBeNull();
    }
  });
});

describe("T-BINDER-07 — ResultSheet & urutan kartu Strategi Binder", () => {
  it("menampilkan Pilihan Investasi di atas Pokok vs Imbal Hasil serta Timeline Proyeksi Tahunan tertutup bawaan", () => {
    for (const slug of eightSlugs.filter((s) => s !== "simulasi-kpr")) {
      const spec = getSpec(slug);
      const answers = validSamples[slug as Exclude<CalculatorSlug, "dana-darurat">];
      const extra = spec.initialExtraState?.() ?? {};
      const payload = spec.toPayload(answers, extra);
      const result = calculate(slug, payload);
      const timeline = (result.timeline as Result[]) ?? [];

      const html = renderToStaticMarkup(
        <ConversationalResults
          spec={spec}
          result={result}
          payload={payload}
          tab={0}
        />,
      );
      expect(html).toContain("Pilihan Investasi");
      expect(html).toContain("Pokok vs Imbal Hasil");
      expect(html.indexOf("Pokok vs Imbal Hasil")).toBeGreaterThan(
        html.indexOf("Pilihan Investasi"),
      );
      expect(html).toContain("Timeline Proyeksi Tahunan");
      expect(html.indexOf("Timeline Proyeksi Tahunan")).toBeGreaterThan(
        html.indexOf("Pokok vs Imbal Hasil"),
      );
      expect(html).toContain("<details");
      expect(html).not.toMatch(/<details\b[^>]*\bopen\b/);
      expect(html).toContain('tabindex="0"');
      expect(html).toContain("<table");
      expect(html).toContain("Tahun");
      expect(html).toContain("Nilai investasi");
      expect(timeline.length).toBeGreaterThan(0);
      expect(html).toContain(money(Number(timeline[0].value)));
      expect(html).toContain(money(Number(timeline[timeline.length - 1].value)));
      expect(html).not.toContain("Alokasi Dana Darurat");
      expect(html).not.toContain("style=");
      expect(html).not.toContain("NaN");
    }
  });

  it("menampilkan tone danger saat strategi gagal dan success saat tercapai", () => {
    const spec = getSpec("annuity");
    const failedPayload = spec.toPayload({
      ...validSamples.annuity,
      initial: "0",
      payment: "100000",
    });
    const failedResult = calculate("annuity", failedPayload);
    const failedHtml = renderToStaticMarkup(
      <ConversationalResults
        spec={spec}
        result={failedResult}
        payload={failedPayload}
        tab={0}
      />,
    );
    expect(failedHtml).toContain('data-tone="danger"');
    expect(failedHtml).toContain("BELUM COCOK");

    const okPayload = spec.toPayload({
      ...validSamples.annuity,
      payment: "2000000",
    });
    const okResult = calculate("annuity", okPayload);
    const okHtml = renderToStaticMarkup(
      <ConversationalResults
        spec={spec}
        result={okResult}
        payload={okPayload}
        tab={0}
      />,
    );
    expect(okHtml).toContain('data-tone="success"');
    expect(okHtml).toContain("SUDAH COCOK");
  });

  it("merender ResultSheet conversational dengan header tone dan tab KPR", () => {
    const kprSheet = renderToStaticMarkup(
      <ResultSheet
        dialog={createRef()}
        onClose={() => {}}
        title="Evaluasi Simulasi KPR"
        subtitle="Ringkasan pinjaman"
        tone="danger"
        tabs={["Ringkasan", "Biaya Transaksi", "Download"]}
        activeTab={0}
        onTabChange={() => {}}
        action={{ label: "Lihat Biaya Transaksi →", onClick: () => {} }}
      >
        {(tab) => <div>Panel {tab}</div>}
      </ResultSheet>,
    );
    expect(kprSheet).toContain('data-tone="danger"');
    expect(kprSheet).toContain("Ringkasan");
    expect(kprSheet).toContain("Biaya Transaksi");
    expect(kprSheet).toContain("Download");
    expect(kprSheet).toContain("Lihat Biaya Transaksi");
    expect(kprSheet).toContain("Tutup");
    expect(kprSheet).not.toContain("style=");
  });
});
