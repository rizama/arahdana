import { useEffect, useState } from "react";
import { Home, Icon } from "./components/Home";
import { BinderShell } from "./binder/BinderShell";
import { Emergency } from "./emergency/Emergency";
import { ConversationalForm } from "./conversational/Form";
import { Feedback } from "./components/Feedback";
import { slugSchema } from "../domain/calculators/schemas";
import styles from "./app.module.css";

function storedTheme() {
  try {
    return localStorage.getItem("theme") === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function currentPath() {
  return typeof location === "undefined" ? "" : location.pathname.replace(/^\/+|\/+$/g, "");
}

function isBinderPath(path: string) {
  return !path || path === "dana-darurat";
}

const initial = storedTheme();
if (typeof document !== "undefined") {
  document.documentElement.dataset.theme = initial;
  document.documentElement.dataset.surface = isBinderPath(currentPath()) ? "binder" : "default";
}

export default function App() {
  const [dark, setDark] = useState(initial === "dark");
  const path = currentPath(),
    parsed = slugSchema.safeParse(path),
    coming = ["liburan", "pendidikan"].includes(path),
    binderRoute = isBinderPath(path);

  useEffect(() => {
    document.documentElement.dataset.surface = binderRoute ? "binder" : "default";
  }, [binderRoute]);

  function toggle() {
    const next = dark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    setDark(!dark);
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* Theme remains usable without storage. */
    }
  }

  if (binderRoute) {
    return (
      <>
        <BinderShell
          route={path === "dana-darurat" ? "dana-darurat" : "home"}
          dark={dark}
          onToggleTheme={toggle}
        >
          {!path ? <Home /> : <Emergency />}
        </BinderShell>
        <Feedback />
      </>
    );
  }

  return (
    <>
      <a href="#main" className={styles.skip}>
        Lewati ke konten
      </a>
      <header className={styles.header}>
        <a href="/" className={styles.brand}>
          Arda.<span>Arah Dana</span>
        </a>
        <nav aria-label="Navigasi utama">
          <a href="/#pilih-tujuan">Kalkulator</a>
          <a href="/#stories-heading">CeritaUang</a>
          <button onClick={toggle} aria-pressed={dark} aria-label="Tema gelap">
            <Icon
              path={
                dark
                  ? "M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"
                  : "M20.5 14.6A8.5 8.5 0 0 1 9.4 3.5 8.5 8.5 0 1 0 20.5 14.6Z"
              }
            />
          </button>
        </nav>
      </header>
      <main id="main" className={styles.page} tabIndex={-1}>
        {parsed.success ? (
          <ConversationalForm key={parsed.data} slug={parsed.data} />
        ) : (
          <section className={styles.hero}>
            <p className={styles.eyebrow}>
              {coming ? "SEGERA HADIR" : "HALAMAN BELUM TERSEDIA"}
            </p>
            <h1>
              {coming
                ? path === "liburan"
                  ? "Liburan"
                  : "Pendidikan"
                : "Mari kembali ke rencanamu."}
            </h1>
            <p>
              {coming
                ? "Kalkulator ini belum tersedia. Temukan rencana lain yang bisa kamu siapkan sekarang."
                : "Alamat ini tidak ditemukan."}
            </p>
            <a href="/" className={styles.cta}>
              Kembali ke beranda →
            </a>
          </section>
        )}
      </main>
      <footer className={styles.footer}>
        © 2026 Arda (Arah Dana). Hak cipta dilindungi.
      </footer>
      <Feedback />
    </>
  );
}
