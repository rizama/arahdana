import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { calculate } from "../../src/domain/calculators/calculators";
import { slugs } from "../../src/domain/calculators/schemas";
import type { Result } from "../../src/domain/calculators/types";
import { BinderShell } from "../../src/web/binder/BinderShell";
import { Home } from "../../src/web/components/Home";
import { money } from "../../src/web/config";
import { getSpec } from "../../src/web/conversational/specs";
import { Emergency } from "../../src/web/emergency/Emergency";
import { ResultSheet } from "../../src/web/emergency/ResultSheet";
import { EmergencyResults } from "../../src/web/emergency/Results";
import {
  computeEmergencySummary,
  emergencyMultiplier,
} from "../../src/web/emergency/summary";

describe("T-BINDER-01 — Binder shell & Home", () => {
  it("renders three folio groups, 9 calculator links, 2 coming-soon items, and 10 #CeritaUang episodes", () => {
    const html = renderToStaticMarkup(<Home />);
    expect(html).toContain('id="pilih-tujuan"');
    expect(html).toContain('id="folio-01"');
    expect(html).toContain('id="folio-02"');
    expect(html).toContain('id="folio-03"');
    expect(html).toContain("Urusan uang emang bikin pusing.");
    expect(html).toContain("tanpa rasa bersalah.");
    for (const slug of slugs) {
      expect(html).toContain(`href="/${slug}"`);
    }
    expect(html.match(/aria-disabled="true"/g) ?? []).toHaveLength(2);
    expect(html).toContain("Lihat playlist #CeritaUang");
    expect(html).not.toContain("style=");
    expect(html).not.toContain("animate-pulse");
    expect(html).not.toContain("JAMINAN ARIP");
  });

  it("renders BinderShell with theme toggle, folder tabs, and colophon footer without inline styles", () => {
    const homeShell = renderToStaticMarkup(
      <BinderShell route="home" dark={false} onToggleTheme={() => {}}>
        <div>Konten</div>
      </BinderShell>,
    );
    expect(homeShell).toContain('aria-label="Tema gelap"');
    expect(homeShell).toContain('href="#folio-01"');
    expect(homeShell).toContain('href="#stories-heading"');
    expect(homeShell).toContain("Jaminan Arsip");
    expect(homeShell).toContain("Arda (Arah Dana)");
    expect(homeShell).not.toContain("style=");
    expect(homeShell).not.toContain("animate-pulse");

    const ddShell = renderToStaticMarkup(
      <BinderShell route="dana-darurat" dark onToggleTheme={() => {}}>
        <div>Form</div>
      </BinderShell>,
    );
    expect(ddShell).toContain('aria-current="page"');
    expect(ddShell).toContain('aria-pressed="true"');
    expect(ddShell).toContain('href="/#pilih-tujuan"');
    expect(ddShell).not.toContain("Indeks Halaman");
    expect(ddShell).not.toContain("Jaminan Arsip");
    expect(ddShell).toContain("Arda (Arah Dana)");
    expect(ddShell).toContain('href="#top"');
  });
});

describe("T-BINDER-02 — Emergency summary & 7-step progressive form", () => {
  it("computes Arda multiplier 6-15x and distinguishes shortfall from projection gap", () => {
    expect(emergencyMultiplier(false, 0)).toBe(6);
    expect(emergencyMultiplier(true, 0)).toBe(9);
    expect(emergencyMultiplier(true, 1)).toBe(12);
    expect(emergencyMultiplier(true, 3)).toBe(15);

    expect(
      computeEmergencySummary({ expense: "", married: "false", dependents: "0" }),
    ).toBeNull();

    const marriedNoDep = computeEmergencySummary({
      expense: "1000000",
      married: "true",
      dependents: "0",
      initial: "",
    });
    expect(marriedNoDep).toMatchObject({
      multiplier: 9,
      target: 9_000_000,
      liquidAllocation: 4_500_000,
      investAllocation: 4_500_000,
      hasCurrent: false,
      current: null,
    });

    const regression = computeEmergencySummary({
      expense: "1000000",
      married: "false",
      dependents: "0",
      initial: "4000000",
    });
    expect(regression).toMatchObject({
      multiplier: 6,
      target: 6_000_000,
      liquidAllocation: 3_000_000,
      investAllocation: 3_000_000,
      hasCurrent: true,
      current: 4_000_000,
      shortfall: 2_000_000,
      surplus: 0,
    });
    expect(regression!.progressPercent).toBeCloseTo((4 / 6) * 100);
  });

  it("matches specs targetNote rule and renders 7 progressive steps with guide & empty summary", () => {
    const spec = getSpec("dana-darurat");
    const note = spec.targetNote?.({
      spec,
      payload: { married: true, dependents: 0 },
      result: {},
      rec: {},
    });
    expect(String(note)).toContain("9× pengeluaran wajib bulanan");

    const html = renderToStaticMarkup(<Emergency />);
    expect(html).toContain("Mulai dari persiapanmu.");
    expect(html).toContain("Terima kasih! Selanjutnya, ayo atur strategi investasimu.");
    expect(html).toContain("Begini alurnya");
    expect(html).toContain("Ringkasan Target");
    expect(html).toContain("Isi pengeluaran wajib bulanan");
    expect(html).not.toContain("style=");
    expect(html).not.toContain("NaN");
    expect(html).not.toContain("RDPU (~4.5%)");
    expect(html).not.toContain("TERVALIDASI PERENCANA");
  });
});

describe("T-BINDER-03 & T-BINDER-04 — Result modal, 3 tabs, regression & Download", () => {
  const regressionInput = {
    expense: 1_000_000,
    married: false,
    dependents: 0,
    years: 1,
    initial: 4_000_000,
    payment: 1_000_000,
    rate: 5,
    dream_name: "",
  };

  it("verifies regression numbers, 50/50 allocation, and 5 instruments on Strategi", () => {
    const result = calculate("dana-darurat", regressionInput);
    const html = renderToStaticMarkup(
      <EmergencyResults result={result} input={regressionInput} tab={0} />,
    );
    expect(html).toContain("Strategi Sudah Cocok");
    expect(html).toContain(money(6_000_000));
    expect(html).toContain(money(3_000_000));
    expect(html).toContain("50% Tabungan Likuid");
    expect(html).toContain("50% Instrumen investasi");
    expect(html).toContain(money(16_534_664.98));
    expect(html).toContain(money(16_000_000));
    expect(html).toContain("3,23%");
    expect(html).toContain(money(result.interest_earned as number));
    expect(html).not.toContain("Timeline Proyeksi Tahunan");
    expect(html).toContain("Pilihan Investasi");
    expect(html.indexOf("Pokok vs Imbal Hasil")).toBeGreaterThan(html.indexOf("Pilihan Investasi"));
    const ordered = [
      "Deposito",
      "Emas",
      "US Dollar",
      "Reksadana Pasar Uang",
      "Reksadana Pendapatan Tetap Tertentu",
    ];
    let prev = -1;
    for (const item of ordered) {
      const idx = html.indexOf(item);
      expect(idx, item).toBeGreaterThan(prev);
      prev = idx;
    }
    expect(html).not.toContain("style=");
    expect(html).not.toContain("NaN");
  });

  it("renders Nominal and Durasi recommendations, 2-point real timeline, and handles null months safely", () => {
    const failedInput = { ...regressionInput, initial: 0, payment: 100_000 };
    const failed = calculate("dana-darurat", failedInput);

    const nominalHtml = renderToStaticMarkup(
      <EmergencyResults
        result={failed}
        input={failedInput}
        tab={1}
        initialSegment="payment"
      />,
    );
    expect(nominalHtml).toContain("Pilih tipe rekomendasi");
    expect(nominalHtml).toContain("Nominal");
    expect(nominalHtml).toContain("Fokus Bulanan");
    expect(nominalHtml).toContain("Timeline Rekomendasi");
    expect(nominalHtml).toContain("Bulan 12");
    expect(nominalHtml).not.toContain("TERVALIDASI PERENCANA");
    expect(nominalHtml).not.toContain("Jatuh Tempo 2026");
    expect(nominalHtml).not.toContain("Terapkan Rekomendasi");
    expect(nominalHtml).not.toContain("style=");
    expect(nominalHtml).not.toContain("NaN");

    const durationHtml = renderToStaticMarkup(
      <EmergencyResults
        result={failed}
        input={failedInput}
        tab={1}
        initialSegment="duration"
      />,
    );
    expect(durationHtml).toContain("Fokus Durasi");
    expect(durationHtml).toContain("Timeline Rekomendasi");
    expect(durationHtml).not.toContain("style=");
    expect(durationHtml).not.toContain("NaN");

    const zeroInput = { ...regressionInput, initial: 0, payment: 0 };
    const zeroResult = calculate("dana-darurat", zeroInput);
    expect((zeroResult.recommendations as Result).months).toBeNull();
    const zeroDurationHtml = renderToStaticMarkup(
      <EmergencyResults
        result={zeroResult}
        input={zeroInput}
        tab={1}
        initialSegment="duration"
      />,
    );
    expect(zeroDurationHtml).toContain("Target belum tercapai dalam batas simulasi");
    expect(zeroDurationHtml).toContain("Lihat rekomendasi Nominal");
    expect(zeroDurationHtml).not.toContain("Timeline Rekomendasi");
    expect(zeroDurationHtml).not.toContain("NaN");
  });

  it("shows only the optional name step when opening Download", () => {
    const result = calculate("dana-darurat", regressionInput);
    const html = renderToStaticMarkup(
      <EmergencyResults result={result} input={regressionInput} tab={2} />,
    );
    expect(html).toContain("Nama kamu (opsional)");
    expect(html).toContain("Lanjut tanpa nama");
    expect(html).not.toContain("Variasi gambar");
    expect(html).not.toContain("Pilih ukuran gambar");
    expect(html).not.toContain("Download Feeds");
    expect(html).not.toContain("Download Stories");
    expect(html).not.toContain("Bagikan Berkas");
    expect(html).not.toContain('value="sam"');
    expect(html).not.toContain("Arda.id");
    expect(html).not.toContain("style=");
    expect(html).not.toContain("NaN");
  });

  it("renders ResultSheet dialog with 3 tabs and footer action without inline styles", () => {
    const html = renderToStaticMarkup(
      <ResultSheet
        dialog={createRef()}
        onClose={() => {}}
        title="Evaluasi Strategi Dana Darurat"
        subtitle="Tinjauan rencana"
        tabs={["Strategi", "Rekomendasi", "Download"]}
        activeTab={0}
        onTabChange={() => {}}
        action={{ label: "Buka Rekomendasi Solusi →", onClick: () => {} }}
      >
        {(tab) => <div>Panel {tab}</div>}
      </ResultSheet>,
    );
    expect(html).toContain('role="tablist"');
    expect(html).toContain('data-tone="success"');
    expect(html).toContain("M4 19.5A2.5 2.5 0 0 1 6.5 17H20");
    expect(html).toContain("Strategi");
    expect(html).toContain("Rekomendasi");
    expect(html).toContain("Download");
    expect(html).toContain("Tutup");
    expect(html).toContain("Buka Rekomendasi Solusi");
    expect(html).not.toContain("style=");

    const dangerHtml = renderToStaticMarkup(
      <ResultSheet
        dialog={createRef()}
        onClose={() => {}}
        title="Evaluasi Strategi Dana Darurat"
        subtitle="Tinjauan rencana"
        tone="danger"
        tabs={["Strategi", "Rekomendasi", "Download"]}
        activeTab={0}
        onTabChange={() => {}}
      >
        {(tab) => <div>Panel {tab}</div>}
      </ResultSheet>,
    );
    expect(dangerHtml).toContain('data-tone="danger"');
    expect(dangerHtml).toContain("M12 9v2m0 4h.01");
    expect(dangerHtml).not.toContain("style=");
  });
});
