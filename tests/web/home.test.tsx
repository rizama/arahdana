import { it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { existsSync, readFileSync } from "node:fs";
import { Home } from "../../src/web/components/Home";
import episodes from "../../src/web/episodes.json";
it("shows nine calculator links; coming-soon cards are noninteractive", () => {
  const html = renderToStaticMarkup(<Home />);
  expect(html.match(/<svg /g) ?? []).toHaveLength(9);
  expect(html.match(/aria-disabled="true"/g) ?? []).toHaveLength(2);
  expect(html).not.toContain('href="/liburan"');
  expect(html).not.toContain('href="/pendidikan"');
});
it.skipIf(!existsSync("fixtures/source-excerpts.json"))("preserves the archived episode identities", () => {
  const source = JSON.parse(readFileSync("fixtures/source-excerpts.json", "utf8"));
  expect(episodes).toEqual(source.video_episodes);
});
it("uses Arda hero option A and hides the #CeritaUang section and hero link", () => {
  const html = renderToStaticMarkup(<Home />);
  expect(html).toContain("Urusan uang emang bikin pusing.");
  expect(html).toContain("tanpa rasa bersalah.");
  expect(html).toContain("Tidak ada tujuan finansial yang instan.");
  expect(html).toContain('id="pilih-tujuan"');
  expect(html).not.toContain('id="pilih-mimpi"');
  expect(html).not.toContain('id="arsip-cerita"');
  expect(html).not.toContain('href="#stories-heading"');
  expect(html).not.toContain("Menghitung" + " Mimpi");
});
