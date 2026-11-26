import { it, expect, beforeAll, afterAll } from "vitest";
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
