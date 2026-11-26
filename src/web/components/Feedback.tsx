import { useRef, useState, type FormEvent } from "react";
import { post } from "../api";
import styles from "../app.module.css";
export function Feedback() {
  const [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setStatus("");
    try {
      const data = new FormData(form);
      const body = await post("/api/feedback", {
        email: data.get("email"),
        message: data.get("message"),
        page: location.pathname,
      });
      setStatus(body.message);
      form.reset();
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Belum tersimpan. Coba lagi.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button type="button" className={styles.feedbackLauncher} aria-label="Buka ruang masukan"
        aria-haspopup="dialog" aria-controls="feedback-dialog" onClick={(event) => {
          setStatus("");
          event.currentTarget.focus({ preventScroll: true });
          dialog.current?.showModal();
        }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H9l-5 4v-4H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
          <path d="M7 9h10M7 13h7" />
        </svg>
        Masukan
      </button>
      <dialog ref={dialog} id="feedback-dialog" className={styles.feedback} aria-labelledby="feedback-heading">
        <header className={styles.feedbackHeader}>
          <div>
            <p className={styles.eyebrow}>RUANG MASUKAN</p>
            <h2 id="feedback-heading">Apa yang bisa kami bantu perbaiki?</h2>
          </div>
          <button type="button" aria-label="Tutup ruang masukan" onClick={() => dialog.current?.close()}>✕</button>
        </header>
        <form onSubmit={submit} aria-busy={busy} onChange={() => setStatus("")}>
          <p>Pesan dan email opsionalmu disimpan sebagai masukan untuk pengembangan Arda (Arah Dana). Jangan sertakan PIN, kata sandi, atau nomor rekening.</p>
          <label htmlFor="feedback-email">Email (opsional)</label>
          <input id="feedback-email" name="email" type="email" maxLength={254} />
          <label htmlFor="feedback-message">Pesan</label>
          <textarea
            id="feedback-message"
            name="message"
            required
            maxLength={5000}
            rows={4}
          />
          <button disabled={busy}>
            {busy ? "Menyimpan…" : "Simpan masukan"}
          </button>
          <p role="status">{status}</p>
        </form>
      </dialog>
    </>
  );
}
