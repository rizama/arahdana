import { useState } from "react";
import type { CalculatorSlug, Result } from "../../domain/calculators/types";
import { money } from "../config";
import { downloadPng } from "../export/render-png";
import binderCss from "../emergency/emergency-binder.module.css";

const exportFormats = [
  {
    name: "Feeds",
    ratio: "1:1",
    size: "1024×1024",
    portrait: false,
    channels: ["Twitter / X", "IG Post", "FB Post"],
  },
  {
    name: "Stories",
    ratio: "9:16",
    size: "1080×1920",
    portrait: true,
    channels: ["IG Story", "WA Status", "FB Story"],
  },
] as const;

const num = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

export function BinderDownloadTab({
  slug,
  title,
  exportTitle,
  result,
  nameLabel = "Nama kamu (opsional)",
  nameKey = "dream_name",
  previewMetricLabel,
  previewAmount,
  showComposition = true,
  initialExportTheme = null,
}: {
  slug: CalculatorSlug;
  title: string;
  exportTitle: string;
  result: Result;
  nameLabel?: string;
  nameKey?: "dream_name" | "child_name";
  previewMetricLabel: string;
  previewAmount: number;
  showComposition?: boolean;
  initialExportTheme?: "light" | "dark" | null;
}) {
  const [name, setName] = useState("");
  const [continueWithoutName, setContinueWithoutName] = useState(false);
  const [exportTheme, setExportTheme] = useState<"light" | "dark" | null>(
    initialExportTheme,
  );
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const principalShare = Math.max(0, Math.min(100, num(result.principal_percent)));
  const interestShare = Math.max(
    0,
    Math.min(100 - principalShare, num(result.interest_percent)),
  );
  const trimmedName = name.trim();
  const showVariants =
    Boolean(trimmedName) || continueWithoutName || Boolean(exportTheme);
  const previewName = trimmedName || "Rencana " + title;
  const inputId = slug + "-export-name";
  const privacyId = slug + "-export-privacy";
  const variantLabelId = slug + "-export-variant";

  async function save(portrait: boolean) {
    if (!exportTheme) return;

    setBusy(true);
    setStatus("Menyiapkan gambar…");
    try {
      await downloadPng(
        { ...result, [nameKey]: trimmedName },
        exportTitle,
        slug,
        portrait,
        exportTheme,
        "Rencana " + title,
      );
      setStatus("Unduhan PNG dimulai.");
    } catch {
      setStatus("Unduhan belum berhasil. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className={binderCss.binderCard}>
        <div>
          <label htmlFor={inputId}>{nameLabel}</label>
          <input
            id={inputId}
            className={binderCss.exportNameInput}
            value={name}
            maxLength={80}
            placeholder="Tuliskan nama atau inisialmu..."
            aria-describedby={privacyId}
            onChange={(event) => {
              const value = event.target.value;
              setName(value);
              setContinueWithoutName(false);
              if (!value.trim()) setExportTheme(null);
            }}
          />
          <p id={privacyId} className={binderCss.paramSub}>
            Nama hanya dipakai di gambar unduhan dan tetap di perangkatmu.
          </p>
        </div>

        {!showVariants && (
          <div>
            <button
              type="button"
              className={binderCss.btnSheetSecondary}
              onClick={() => setContinueWithoutName(true)}
            >
              Lanjut tanpa nama
            </button>
          </div>
        )}
      </section>

      {showVariants && (
        <section className={binderCss.binderCard}>
          <div className={binderCss.binderCardHead}>
            <h3 id={variantLabelId}>Variasi gambar</h3>
          </div>
          <div
            className={binderCss.exportThemeRow}
            role="group"
            aria-labelledby={variantLabelId}
          >
            {(["light", "dark"] as const).map((variant) => (
              <button
                key={variant}
                type="button"
                className={binderCss.exportThemeBtn}
                aria-pressed={exportTheme === variant}
                autoFocus={continueWithoutName && variant === "light"}
                onClick={() => setExportTheme(variant)}
              >
                {variant === "light" ? "Light" : "Dark"}
              </button>
            ))}
          </div>
        </section>
      )}

      {exportTheme && (
        <section aria-label="Pilih ukuran gambar">
          <div className={binderCss.binderCardHead}>
            <h3>Pilih ukuran gambar</h3>
            <span className={binderCss.binderCardNote}>
              PNG resolusi tinggi · {exportTheme === "light" ? "Light" : "Dark"}
            </span>
          </div>

          <div className={binderCss.exportCards} aria-busy={busy}>
            {exportFormats.map((fmt) => (
              <article className={binderCss.exportCard} key={fmt.name}>
                <div className={binderCss.previewStage}>
                  <div
                    className={
                      binderCss.miniCard +
                      " " +
                      (fmt.portrait ? binderCss.miniStory : binderCss.miniSquare)
                    }
                    data-preview-theme={exportTheme}
                  >
                    <div className={binderCss.miniHead}>
                      <span className={binderCss.miniLogo} aria-hidden="true">
                        A
                      </span>
                      <span>{title}</span>
                    </div>
                    <div>
                      <div className={binderCss.miniTitle}>{previewMetricLabel}</div>
                      <div className={binderCss.miniAmount}>{money(previewAmount)}</div>
                    </div>
                    {showComposition && (
                      <svg
                        className={binderCss.miniSvg}
                        viewBox="0 0 100 8"
                        preserveAspectRatio="none"
                        aria-hidden="true"
                      >
                        <rect
                          className={binderCss.barPokok}
                          x="0"
                          y="0"
                          width={principalShare}
                          height="8"
                        />
                        <rect
                          className={binderCss.barBunga}
                          x={principalShare}
                          y="0"
                          width={interestShare}
                          height="8"
                        />
                      </svg>
                    )}
                    <div className={binderCss.miniFoot}>
                      <span className={binderCss.miniName}>{previewName}</span>
                      <span>Arda</span>
                    </div>
                  </div>
                </div>

                <div className={binderCss.exportMeta}>
                  <h4>
                    {fmt.name} ({fmt.ratio})
                  </h4>
                  <p>{fmt.size} piksel</p>
                  <div className={binderCss.tagRow}>
                    {fmt.channels.map((channel) => (
                      <span key={channel}>{channel}</span>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  className={binderCss.downloadBtn}
                  disabled={busy}
                  aria-label={`Download ${fmt.name} ${exportTheme === "light" ? "Light" : "Dark"}`}
                  onClick={() => void save(fmt.portrait)}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1m-4-4-4 4m0 0-4-4m4 4V4" />
                  </svg>
                  <span>Download {fmt.name}</span>
                </button>
              </article>
            ))}
          </div>
          <p role="status" className={binderCss.statusText}>
            {status}
          </p>
        </section>
      )}
    </>
  );
}
