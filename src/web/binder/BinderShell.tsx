import type { ReactNode } from "react";
import css from "./binder.module.css";

function ThemeIcon({ dark }: { dark: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path
        d={
          dark
            ? "M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"
            : "M20.5 14.6A8.5 8.5 0 0 1 9.4 3.5 8.5 8.5 0 1 0 20.5 14.6Z"
        }
      />
    </svg>
  );
}

export function BinderShell({
  route,
  dark,
  onToggleTheme,
  children,
}: {
  route: "home" | "dana-darurat";
  dark: boolean;
  onToggleTheme: () => void;
  children: ReactNode;
}) {
  const containerClass = route === "home" ? css.binderContainer : css.binderContainerNarrow;
  const mainClass =
    css.ledgerMain + " " + (route === "home" ? css.ledgerMainHome : css.ledgerMainForm);

  return (
    <div id="top" className={css.deskShell}>
      <a href="#main" className={css.skip}>
        Lewati ke konten
      </a>
      <div className={containerClass}>
        <header className={css.binderHeader}>
          <div className={css.rulerStrip} aria-hidden="true">
            <span>| 00 cm |</span>
            <span>·· 10 ··</span>
            <span>| 20 cm |</span>
            <span>·· 30 ··</span>
            <span>| 40 cm |</span>
            <span>| 50 cm |</span>
          </div>
          <div className={css.headerBar}>
            <div className={css.brandGroup}>
              <div className={css.ringHoles} aria-hidden="true">
                <span className={css.ringHole} />
                <span className={css.ringHole} />
                <span className={css.ringHole} />
              </div>
              <div className={css.brandMeta}>
                <div className={css.brandRow}>
                  <a href="/" className={css.brandLink}>
                    Arda<span className={css.brandDot}>.</span>
                  </a>
                  <span className={css.brandBadge}>ARAH DANA</span>
                </div>
                <p className={css.brandTagline}>
                  Buku Catatan Keuangan: Jangan Dihakimi, Yuk Dicatat Santai.
                </p>
              </div>
            </div>
            <div className={css.headerControls}>
              <button
                type="button"
                className={css.themeToggle}
                onClick={onToggleTheme}
                aria-pressed={dark}
                aria-label="Tema gelap"
              >
                <ThemeIcon dark={dark} />
              </button>
            </div>
          </div>
              <nav aria-label="Navigasi utama" className={css.folderNav}>
                {route === "home" ? (
                  <>
                    <a href="#folio-01" className={css.folderTab + " " + css.tabSage}>
                      <span className={css.tabDot} aria-hidden="true" />
                      <span>Tab 01: Fondasi</span>
                    </a>
                    <a href="#folio-02" className={css.folderTab + " " + css.tabOchre}>
                      <span className={css.tabDot} aria-hidden="true" />
                      <span>Tab 02: Rumah</span>
                    </a>
                    <a href="#folio-03" className={css.folderTab + " " + css.tabClay}>
                      <span className={css.tabDot} aria-hidden="true" />
                      <span>Tab 03: Keluarga</span>
                    </a>
                    <a href="#stories-heading" className={css.folderTab + " " + css.tabTerracotta}>
                      <span className={css.tabDot} aria-hidden="true" />
                      <span>#CeritaUang</span>
                    </a>
                  </>
                ) : (
                  <>
                    <a href="/" className={css.folderTab + " " + css.tabPaper}>
                      <span>← Beranda</span>
                    </a>
                    <a href="/#pilih-tujuan" className={css.folderTab + " " + css.tabOchre}>
                      <span>Kalkulator</span>
                    </a>
                    <a
                      href="/dana-darurat"
                      aria-current="page"
                      className={css.folderTab + " " + css.tabSage}
                    >
                      <span className={css.tabDot} aria-hidden="true" />
                      <span>Dana Darurat</span>
                    </a>
                    <a href="/#stories-heading" className={css.folderTab + " " + css.tabTerracotta}>
                      <span>#CeritaUang</span>
                    </a>
                  </>
                )}
              </nav>
        </header>

        <main id="main" className={mainClass} tabIndex={-1}>
          {children}
        </main>

        <footer className={css.binderFooter}>
          {route === "home" && (
            <div className={css.footerGrid}>
              <div>
                <div className={css.brandRow}>
                  <span className={css.brandLink}>
                    Arda<span className={css.brandDot}>.</span>
                  </span>
                  <span className={css.brandBadge}>ARAH DANA</span>
                </div>
                <p className={css.footerDesc}>
                  Buku catatan dan kalkulator finansial yang dirancang agar kita bisa memetakan uang
                  sendiri dengan tenang, bertahap, dan terukur.
                </p>
                <p className={css.footerHand}>
                  “Persiapan. Proses. Sampai tujuan.”
                </p>
              </div>
              <div>
                <div className={css.footerColTitle}>Indeks Halaman</div>
                <ul className={css.footerList}>
                  <li>
                    <a href="#folio-01">Tab 01: Fondasi keuangan</a>
                  </li>
                  <li>
                    <a href="#folio-02">Tab 02: Rumah &amp; pembelian</a>
                  </li>
                  <li>
                    <a href="#folio-03">Tab 03: Keluarga &amp; pendidikan</a>
                  </li>
                  <li>
                    <a href="#stories-heading">Arsip: #CeritaUang</a>
                  </li>
                </ul>
              </div>
              <div>
                <div className={css.footerColTitle}>Jaminan Arsip</div>
                <ul className={css.footerList}>
                  <li>✓ Gratis &amp; tanpa iklan</li>
                  <li>✓ Tanpa daftar akun / login</li>
                  <li>✓ Simulasi cepat tanpa simpan data</li>
                  <li>✓ Bisa diulang &amp; ekspor PNG</li>
                </ul>
              </div>
            </div>
          )}
          <div className={css.footerBottom}>
            <span>© 2026 Arda (Arah Dana). Hak cipta dilindungi.</span>
            <a href="#top">Kembali ke Atas ↑</a>
          </div>
        </footer>
      </div>
    </div>
  );
}
