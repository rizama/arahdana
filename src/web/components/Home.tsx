import { useRef } from "react";
import type { CalculatorSlug } from "../../domain/calculators/types";
import { calculators } from "../config";
import episodes from "../episodes.json";
import css from "../binder/binder.module.css";

export function Icon({ path }: { path: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

function Paperclip() {
  return (
    <svg
      className={css.paperclip}
      viewBox="0 0 24 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 12v22a6 6 0 0 0 12 0V9a4 4 0 0 0-8 0v24a2 2 0 0 0 4 0V14" />
    </svg>
  );
}

type BadgeTone = "sage" | "ochre" | "terracotta" | "ink";
type SlipMeta = {
  badge: string;
  tone: BadgeTone;
  quote: string;
  specLabel: string;
  specValue: string;
  metricLabel: string;
  metricValue: string;
  time: string;
  cta: string;
};

const badgeClass: Record<BadgeTone, string> = {
  sage: css.badgeSage,
  ochre: css.badgeOchre,
  terracotta: css.badgeTerracotta,
  ink: css.badgeInk,
};

const goalGroups: {
  id: string;
  number: string;
  badgeStyle: string;
  handStyle: string;
  handNote: string;
  title: string;
  note: string;
  slugs: CalculatorSlug[];
}[] = [
  {
    id: "folio-01",
    number: "01",
    badgeStyle: css.tabSage,
    handStyle: css.handSage,
    handNote: "“Biar malam minggu nggak kepikiran saldo”",
    title: "Buku 01 — Fondasi keuangan",
    note: "Siapkan cadangan hari ini, lalu hitung kebutuhan untuk tahun-tahun berikutnya.",
    slugs: ["dana-darurat", "annuity", "dana-pensiun"],
  },
  {
    id: "folio-02",
    number: "02",
    badgeStyle: css.tabOchre,
    handStyle: css.handOchre,
    handNote: "“Biar dompet nggak sesak di tengah jalan”",
    title: "Buku 02 — Rumah & pembelian",
    note: "Pisahkan uang muka dari cicilan. Lihat berapa yang perlu terkumpul sebelum membeli.",
    slugs: ["properti", "simulasi-kpr", "kendaraan", "barang"],
  },
  {
    id: "folio-03",
    number: "03",
    badgeStyle: css.tabClay,
    handStyle: css.handClay,
    handNote: "“Langkah teratur untuk momen penting”",
    title: "Buku 03 — Keluarga & pendidikan",
    note: "Dua rencana dengan banyak pos biaya. Mulai dari anggarannya satu per satu.",
    slugs: ["menikah", "pendidikan-anak"],
  },
];

const goalCopy: Record<CalculatorSlug, string> = {
  "dana-darurat": "Hitung cadangan dari pengeluaran dan tanggungan.",
  annuity: "Bandingkan setoran rutin dengan target investasimu.",
  "dana-pensiun": "Perkirakan dana hidup setelah berhenti bekerja.",
  properti: "Hitung target uang muka dan setoran bulanannya.",
  "simulasi-kpr": "Cek cicilan saat bunga fix beralih ke floating.",
  kendaraan: "Siapkan uang muka kendaraan pilihanmu.",
  barang: "Hitung waktu menabung untuk barang yang kamu incar.",
  menikah: "Susun anggaran total atau rinci tiap pos acara.",
  "pendidikan-anak": "Rencanakan biaya SD hingga kuliah, per jenjang.",
};

const slipMeta: Record<CalculatorSlug, SlipMeta> = {
  "dana-darurat": {
    badge: "POS: AMAN GAJI",
    tone: "sage",
    quote: "“Biar saat darurat datang, kamu tidak perlu panik mencari pinjaman.”",
    specLabel: "PENGALI ARDA",
    specValue: "6–15× BULANAN",
    metricLabel: "ALOKASI",
    metricValue: "50% LIKUID · 50% INVEST",
    time: "~3 menit",
    cta: "[ HITUNG SEKARANG ] →",
  },
  annuity: {
    badge: "POS: BERKEMBANG",
    tone: "ochre",
    quote: "“Mulai dari nominal yang sanggup dulu, yang penting konsisten berjalan.”",
    specLabel: "FREKUENSI",
    specValue: "BULANAN / TAHUNAN",
    metricLabel: "SETORAN",
    metricValue: "AWAL / AKHIR PERIODE",
    time: "~4 menit",
    cta: "[ BUKA SIMULASI ] →",
  },
  "dana-pensiun": {
    badge: "POS: MASA DEPAN",
    tone: "terracotta",
    quote: "“Menyiapkan hari tua sejak awal agar masa depan tetap mandiri.”",
    specLabel: "BASIS TARGET",
    specValue: "25× TAHUNAN (4%)",
    metricLabel: "PENYESUAIAN",
    metricValue: "TERINFLASI OTOMATIS",
    time: "~5 menit",
    cta: "[ CEK ESTIMASI ] →",
  },
  properti: {
    badge: "PROPERTI",
    tone: "terracotta",
    quote: "“Rumah dimulai dari persiapan uang muka yang terukur sejak hari ini.”",
    specLabel: "KEBIJAKAN RUMUS",
    specValue: "TERKOREKSI / ARSIP",
    metricLabel: "LANJUTAN",
    metricValue: "PREFILL SIMULASI KPR",
    time: "~4 menit",
    cta: "[ CEK DP ] →",
  },
  "simulasi-kpr": {
    badge: "SIMULASI KPR",
    tone: "ink",
    quote: "“Pahami perubahan cicilan saat bunga promo beralih ke bunga floating.”",
    specLabel: "KELAYAKAN",
    specValue: "4 RASIO PENGHASILAN",
    metricLabel: "BIAYA",
    metricValue: "7 POS + BPHTB",
    time: "~4 menit",
    cta: "[ SIMULASI KPR ] →",
  },
  kendaraan: {
    badge: "KENDARAAN",
    tone: "ochre",
    quote: "“Menyiapkan uang muka kendaraan agar cicilan tetap ramah di dompet.”",
    specLabel: "KEBIJAKAN RUMUS",
    specValue: "TERKOREKSI / ARSIP",
    metricLabel: "PEMBANDING",
    metricValue: "INFLASI BERTAHAP",
    time: "~3 menit",
    cta: "[ CEK DP KENDARAAN ] →",
  },
  barang: {
    badge: "TARGET BARANG",
    tone: "sage",
    quote: "“Keinginan bisa jadi rencana nyata saat ada angka dan tenggat waktunya.”",
    specLabel: "DURASI TARGET",
    specValue: "SATUAN BULAN",
    metricLabel: "PEMBANDING",
    metricValue: "INFLASI BERTAHAP",
    time: "~3 menit",
    cta: "[ BUAT TARGET ] →",
  },
  menikah: {
    badge: "HARI BAHAGIA",
    tone: "terracotta",
    quote: "“Pestanya terasa tenang saat anggarannya disusun terbuka bersama.”",
    specLabel: "MODE BIAYA",
    specValue: "TOTAL / 13 POS",
    metricLabel: "PEMBANDING",
    metricValue: "ARSIP & BERTAHAP",
    time: "~5 menit",
    cta: "[ RINCI BIAYA NIKAH ] →",
  },
  "pendidikan-anak": {
    badge: "PENDIDIKAN",
    tone: "sage",
    quote: "“Setiap jenjang sekolah adalah langkah baru yang bisa disiapkan pelan-pelan.”",
    specLabel: "JENJANG",
    specValue: "SD · SMP · SMA · S1",
    metricLabel: "STRATEGI",
    metricValue: "UP / SPP / SEMUA",
    time: "~5 menit",
    cta: "[ CEK DANA SEKOLAH ] →",
  },
};

const plateTones = [css.plateInk, css.plateOchre, css.plateSage, css.plateTerracotta];

export function Home() {
  const carousel = useRef<HTMLDivElement>(null);

  return (
    <>
      <section className={css.heroSection} aria-labelledby="hero-heading">
        <div className={css.heroLeft}>
          <h1 id="hero-heading" className={css.heroTitle}>
            Urusan uang emang bikin pusing. Tapi buku ini dibuat biar kita bisa <span>mulai hitung pelan-pelan</span> tanpa rasa bersalah.
          </h1>
          <p className={css.heroLead}>
            Tidak ada tujuan finansial yang instan. Dari dana darurat sampai pensiun, Arda membantu
            memetakan target dan langkah rutinmu secara terukur.
          </p>
          <div className={css.heroActions}>
            <a className={css.btnPrimaryHard} href="#pilih-tujuan">
              <span>BUKA SLIP HITUNGAN</span>
              <span aria-hidden="true">↓</span>
            </a>
            <a className={css.btnSecondary} href="#stories-heading">
              BACA #CERITAUANG ↗
            </a>
          </div>
        </div>
        <div className={css.heroRight}>
          <div className={css.stickyNote + " " + css.washiWrap}>
            <div className={css.stickyHeader}>
              <span>CATATAN TEMPEL</span>
              <span>PEGANGAN ARDA</span>
            </div>
            <p className={css.stickyQuote}>
              “Kalo liat saldo sekarang jangan berkecil hati. Yang penting kita paham peta jalan dan tau berapa angka aman buat napas lega.”
            </p>
            <div className={css.stickyFooter}>- kawan ngopimu</div>
          </div>
          <div className={css.quickStatSlip}>
            <span>
              ALAT TERSEDIA: <strong>9 KALKULATOR</strong>
            </span>
            <span>
              AKSES: <strong className={css.statAccent}>TANPA AKUN</strong>
            </span>
          </div>
        </div>
      </section>

      <section id="pilih-tujuan" aria-labelledby="goals-heading" className={css.goalDirectory}>
        <h2 id="goals-heading" className={css.srOnly}>
          Mulai dari kebutuhanmu
        </h2>
        {goalGroups.map((group) => (
          <section key={group.id} id={group.id} className={css.folioSection}>
            <div className={css.folioHeader}>
              <div className={css.folioTitleWrap}>
                <span className={css.folioNumber + " " + group.badgeStyle} aria-hidden="true">
                  {group.number}
                </span>
                <div>
                  <h3>{group.title}</h3>
                  <p className={css.folioNote}>{group.note}</p>
                </div>
              </div>
              <span className={css.folioHandNote + " " + group.handStyle}>{group.handNote}</span>
            </div>

            <ul className={css.slipGrid}>
              {group.slugs.map((slug) => {
                const meta = slipMeta[slug];
                return (
                  <li key={slug}>
                    <article className={css.slipCard}>
                      <Paperclip />
                      <div className={css.slipTop}>
                        <div className={css.slipBadgeRow}>
                          <span className={css.posBadge + " " + badgeClass[meta.tone]}>
                            {meta.badge}
                          </span>
                        </div>
                        <div>
                          <h4 className={css.slipTitle}>{calculators[slug].title}</h4>
                          <p className={css.slipDesc}>{goalCopy[slug]}</p>
                        </div>
                        <p className={css.slipMarginNote}>{meta.quote}</p>
                        <div className={css.specimenBox}>
                          <div className={css.specimenRow}>
                            <span>{meta.specLabel}</span>
                            <span>{meta.specValue}</span>
                          </div>
                          <div className={css.specimenStrong}>
                            <span>{meta.metricLabel}</span>
                            <span>{meta.metricValue}</span>
                          </div>
                        </div>
                      </div>
                      <div className={css.slipFooter}>
                        <span className={css.slipTime}>Waktu: {meta.time}</span>
                        <a href={"/" + slug} className={css.slipLink}>
                          {meta.cta}
                        </a>
                      </div>
                    </article>
                  </li>
                );
              })}

              {group.id === "folio-03" && (
                <li>
                  <article className={css.draftCard + " " + css.washiWrap}>
                    <div>
                      <span className={css.draftLabel}>DRAF CATATAN MEJA REDAKSI</span>
                      <h4 className={css.draftTitle}>Segera hadir berikutnya</h4>
                      <ul className={css.draftList}>
                        <li>
                          <span className={css.draftDot} aria-hidden="true" />
                          <span aria-disabled="true">Liburan — segera hadir</span>
                        </li>
                        <li>
                          <span className={css.draftDot} aria-hidden="true" />
                          <span aria-disabled="true">Pendidikan umum — segera hadir</span>
                        </li>
                      </ul>
                    </div>
                    <p className={css.draftFoot}>
                      *Disiapkan bertahap dari pertanyaan dan catatan nyata pengguna.
                    </p>
                  </article>
                </li>
              )}
            </ul>
          </section>
        ))}
      </section>

      <section id="arsip-cerita" aria-labelledby="stories-heading" className={css.archiveSection}>
        <div className={css.archiveHeader}>
          <div>
            <span className={css.archiveBadge}>KENALI UANGMU · #CERITAUANG</span>
            <h2 id="stories-heading">#CeritaUang</h2>
            <p className={css.archiveDesc}>
              Gaji pas-pasan, tanggungan keluarga, sampai utang setelah menikah. Sepuluh cerita
              tentang keputusan di balik angka.
            </p>
          </div>
          <div className={css.carouselActions}>
            <button
              type="button"
              className={css.carouselBtn}
              onClick={() =>
                carousel.current?.scrollBy({
                  left: -320,
                  behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
                    ? "instant"
                    : "smooth",
                })
              }
              aria-label="Episode sebelumnya"
            >
              ←
            </button>
            <button
              type="button"
              className={css.carouselBtn + " " + css.carouselBtnPrimary}
              onClick={() =>
                carousel.current?.scrollBy({
                  left: 320,
                  behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
                    ? "instant"
                    : "smooth",
                })
              }
              aria-label="Episode berikutnya"
            >
              →
            </button>
          </div>
        </div>

        <div
          className={css.carousel}
          ref={carousel}
          tabIndex={0}
          role="region"
          aria-label="10 episode CeritaUang"
        >
          {episodes.map(([id, title], i) => (
            <a
              href={"https://www.youtube.com/watch?v=" + id}
              key={id}
              target="_blank"
              rel="noopener noreferrer"
              className={css.episodeCard}
            >
              <div className={css.episodePlate}>
                <div className={css.episodePlateHead + " " + plateTones[i % plateTones.length]}>
                  <span>BERKAS #{String(i + 1).padStart(2, "0")}</span>
                  <span>ARSIP</span>
                </div>
                <img
                  src={"/posters/episode-" + (i + 1) + ".svg"}
                  alt=""
                  width="480"
                  height="270"
                />
              </div>
              <span className={css.episodeTitle}>{title}</span>
              <div className={css.episodeFoot}>
                <small>VIDEO #CERITAUANG</small>
                <span className={css.episodeCta}>Buka di YouTube ↗</span>
              </div>
            </a>
          ))}
        </div>

        <a
          href="https://www.youtube.com/playlist?list=PLaRLWENa_gNqs0WEdo2f4IKTuCgBmRQVg"
          target="_blank"
          rel="noopener noreferrer"
          className={css.playlistLink}
        >
          Lihat playlist #CeritaUang ↗
        </a>
      </section>
    </>
  );
}
