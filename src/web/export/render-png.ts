import type { Result } from "../../domain/calculators/types";
import { money, percent } from "../config";
export type ExportTheme = "active" | "light" | "dark";
function tokens(theme: ExportTheme) {
  const root = document.documentElement,
    previous = root.getAttribute("data-theme");
  try {
    if (theme !== "active") root.dataset.theme = theme;
    const css = getComputedStyle(root);
    return Object.fromEntries(
      [
        "bg-canvas",
        "bg-surface",
        "text-primary",
        "text-secondary",
        "brand-surface",
        "brand-text-on-surface",
        "font-heading",
        "font-body",
        "font-mono",
        "border-strong",
      ].map((key) => [key, css.getPropertyValue("--" + key).trim()]),
    );
  } finally {
    if (previous === null) root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", previous);
  }
}
export async function renderPng(
  result: Result,
  title: string,
  portrait: boolean,
  theme: ExportTheme,
  fallbackName = "Rencana keuanganmu",
): Promise<Blob> {
  await document.fonts.ready;
  const palette = tokens(theme),
    canvas = document.createElement("canvas");
  canvas.width = portrait ? 1080 : 1024;
  canvas.height = portrait ? 1920 : 1024;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas tidak tersedia");
  const c = context,
    w = canvas.width,
    h = canvas.height,
    pad = 64;
  c.fillStyle = palette["bg-canvas"];
  c.fillRect(0, 0, w, h);
  c.fillStyle = palette["brand-surface"];
  c.fillRect(0, 0, w, 160);
  c.fillStyle = palette["brand-text-on-surface"];
  c.font = "bold 38px " + palette["font-heading"];
  c.fillText("Arda — Arah Dana", pad, 67);
  c.font = "26px " + palette["font-body"];
  c.fillText(title, pad, 120, w - pad * 2);
  c.fillStyle = palette["text-primary"];
  c.font = "bold 29px " + palette["font-heading"];
  const name = String(
    result.child_name || result.dream_name || fallbackName,
  );
  const nameLines: string[] = [];
  let line = "";
  for (const ch of name) {
    if (c.measureText(line + ch).width > w - pad * 2) {
      nameLines.push(line);
      line = ch;
    } else line += ch;
  }
  if (line) nameLines.push(line);
  nameLines
    .slice(0, 3)
    .forEach((text, i) => c.fillText(text, pad, 217 + i * 36));
  c.font = "bold 25px " + palette["font-body"];
  const state = String(result.strategy_state);
  c.fillText(
    { success: "Sudah Cocok", almost: "Hampir Cocok", failed: "Belum Cocok" }[
      state
    ] ?? "Simulasi KPR",
    pad,
    portrait ? 360 : 345,
  );
  const n = (key: string) =>
    typeof result[key] === "number" ? (result[key] as number) : 0;
  const rows: [string, number][] =
    "target" in result
      ? [
          ["Target dana", n("target")],
          ["Proyeksi investasi", n("future_value")],
          ["Kekurangan", n("gap")],
          ["Setoran rutin dibutuhkan", n("recommended_payment")],
        ]
      : [
          ["Pokok pinjaman", n("principal")],
          ["Cicilan pertama", n("first_payment")],
          ["Total bunga", n("total_interest")],
        ];
  let y = portrait ? 500 : 415;
  const gap = portrait ? 230 : 105;
  for (const [label, value] of rows) {
    c.fillStyle = palette["text-secondary"];
    c.font = "23px " + palette["font-body"];
    c.fillText(label, pad, y);
    c.fillStyle = palette["text-primary"];
    c.font = "bold " + (portrait ? 43 : 34) + "px " + palette["font-mono"];
    c.fillText(money(value), pad, y + 48, w - pad * 2);
    y += gap;
  }
  if ("target" in result) {
    const pct = Math.max(0, Math.min(1, n("principal_percent") / 100));
    c.fillStyle = palette["border-strong"];
    c.fillRect(pad, y, w - pad * 2, 20);
    c.fillStyle = palette["brand-surface"];
    c.fillRect(pad, y, (w - pad * 2) * pct, 20);
    c.fillStyle = palette["text-primary"];
    c.font = "21px " + palette["font-body"];
    c.fillText(
      "Pokok " +
        percent(n("principal_percent")) +
        " · Imbal hasil " +
        percent(n("interest_percent")),
      pad,
      y + 55,
      w - pad * 2,
    );
  }
  c.fillStyle = palette["text-secondary"];
  c.font = "20px " + palette["font-body"];
  c.fillText("Simulasi lokal · asumsi bukan jaminan hasil", pad, h - 72);
  c.fillText(new Intl.DateTimeFormat("id-ID").format(new Date()), pad, h - 37);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("PNG belum tersedia")),
      "image/png",
    ),
  );
}
export async function downloadPng(
  result: Result,
  title: string,
  slug: string,
  portrait: boolean,
  theme: ExportTheme,
  fallbackName?: string,
) {
  const blob = await renderPng(result, title, portrait, theme, fallbackName),
    url = URL.createObjectURL(blob),
    anchor = document.createElement("a");
  anchor.href = url;
  anchor.download =
    slug + "-" + (portrait ? "story" : "square") + "-" + theme + ".png";
  try {
    document.body.append(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
