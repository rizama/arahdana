import { it, expect, beforeAll, afterAll } from "vitest";
import { existsSync } from "node:fs";
import { httpHarness } from "./harness.js";
let h: Awaited<ReturnType<typeof httpHarness>>;
beforeAll(async () => {
  h = await httpHarness();
});
afterAll(async () => h.close());
it("serves all calculator and coming-soon entry URLs with production assets and strict CSP", async () => {
  for (const slug of [
    "",
    "annuity",
    "dana-darurat",
    "properti",
    "kendaraan",
    "barang",
    "menikah",
    "dana-pensiun",
    "pendidikan-anak",
    "simulasi-kpr",
    "liburan",
    "pendidikan",
  ]) {
    const r = await fetch(h.origin + "/" + slug),
      html = await r.text();
    expect(r.status).toBe(200);
    expect(html).toContain("/assets/");
    expect(html).not.toContain("/src/web");
    expect(r.headers.get("content-security-policy")).not.toMatch(
      /unsafe-inline|unsafe-eval/,
    );
  }
  expect((await fetch(h.origin + "/api/unknown")).status).toBe(404);
  expect((await fetch(h.origin + "/not-a-page")).status).toBe(404);
});
it("serves ten CSP-safe local poster SVGs, no remote image/script resource", async () => {
  for (let i = 1; i <= 10; i++) {
    const r = await fetch(h.origin + "/posters/episode-" + i + ".svg");
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toContain("image/svg+xml");
    const svg = await r.text();
    expect(svg).not.toMatch(/<script|<image|href=/);
  }
});
it("loads Pally only when bundled and serves /fonts under strict CSP", async () => {
  const htmlRes = await fetch(h.origin + "/");
  expect(htmlRes.status).toBe(200);
  const html = await htmlRes.text();
  const pallyBundled = existsSync("dist/fonts/Pally-Variable.woff2");
  expect(html.includes("/fonts/Pally-Variable.woff2")).toBe(pallyBundled);
  expect(html.includes("/pally.css")).toBe(pallyBundled);
  if (pallyBundled) {
    expect(html).toMatch(
      /<link[^>]+rel="preload"[^>]+href="\/fonts\/Pally-Variable\.woff2"[^>]+as="font"[^>]+type="font\/woff2"[^>]+crossorigin/i,
    );
    const css = await fetch(h.origin + "/pally.css");
    expect(css.status).toBe(200);
    expect(await css.text()).toContain("/fonts/Pally-Variable.woff2");
  }

  const pally = await fetch(h.origin + "/fonts/Pally-Variable.woff2");
  expect(pally.status).toBe(pallyBundled ? 200 : 404);
  if (pallyBundled) expect(pally.headers.get("content-type")).toContain("font/woff2");
  const fontRes = await fetch(h.origin + "/fonts/Caveat-Regular.ttf");
  expect(fontRes.status).toBe(200);
  const cacheControl = fontRes.headers.get("cache-control") ?? "";
  expect(cacheControl).toContain("max-age=31536000");
  expect(cacheControl).toContain("immutable");
  expect(fontRes.headers.get("content-security-policy")).toContain(
    "default-src 'self'",
  );

  const missingFont = await fetch(h.origin + "/fonts/missing.woff2");
  expect(missingFont.status).toBe(404);
});
