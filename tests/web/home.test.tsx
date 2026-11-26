import { it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { existsSync, readFileSync } from "node:fs";
import { Home } from "../../src/web/components/Home";
it("shows ten episode links and nine calculator links; coming-soon cards are noninteractive", () => {
  const html = renderToStaticMarkup(<Home />);
  expect(html.match(/https:\/\/www\.youtube\.com\/watch\?v=/g) ?? []).toHaveLength(10);
  expect(html.match(/<svg /g) ?? []).toHaveLength(9);
  expect(html.match(/aria-disabled="true"/g) ?? []).toHaveLength(2);
  expect(html).not.toContain('href="/liburan"');
  expect(html).not.toContain('href="/pendidikan"');
});
it.skipIf(!existsSync("fixtures/source-excerpts.json"))("preserves the archived episode identities", () => {
  const html = renderToStaticMarkup(<Home />),
    source = JSON.parse(readFileSync("fixtures/source-excerpts.json", "utf8"));
  for (const [id, title] of source.video_episodes) {
    expect(html).toContain("https://www.youtube.com/watch?v=" + id);
    expect(html).toContain(
      title
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#x27;"),
    );
  }
});
it("uses Arda hero option A, the renamed directory anchor, and keeps #CeritaUang", () => {
  const html = renderToStaticMarkup(<Home />);
  expect(html).toContain("Urusan uang emang bikin pusing.");
  expect(html).toContain("tanpa rasa bersalah.");
  expect(html).toContain("Tidak ada tujuan finansial yang instan.");
  expect(html).toContain('id="pilih-tujuan"');
  expect(html).not.toContain('id="pilih-mimpi"');
  expect(html).toContain('id="stories-heading"');
  expect(html).toContain("#CeritaUang");
  expect(html).not.toContain("Menghitung" + " Mimpi");
});
