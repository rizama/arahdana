import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { slugs } from "../../src/domain/calculators/schemas";
import { getSpec } from "../../src/web/conversational/specs";

it("uses the Arda introduction on all nine calculators", () => {
  for (const slug of slugs) {
    const spec = getSpec(slug);
    expect(spec.intro).toBe("Mulai dari persiapanmu.");
    expect(spec.intro).not.toContain("mimpi");
  }
});
it("uses Arah Dana branding and the arahdana project name", () => {
  const read = (path: string) => readFileSync(path, "utf8");
  expect(read("index.html")).toContain("<title>Arda — Arah Dana</title>");
  expect(read("src/web/export/render-png.ts")).toContain('c.fillText("Arda — Arah Dana", pad, 67);');
  expect(read("src/server/index.ts")).toContain("console.log('Arda (Arah Dana)");
  const manifest = JSON.parse(read("package.json"));
  const lockfile = JSON.parse(read("package-lock.json"));
  expect(manifest.name).toBe("arahdana");
  expect(lockfile.name).toBe(manifest.name);
  expect(lockfile.packages[""].name).toBe(manifest.name);
});
