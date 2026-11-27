import { closeSync, existsSync, openSync, readSync, statSync } from "node:fs";
import path from "node:path";

const DEFAULT_FONT_PATH = "public/fonts/Pally-Variable.woff2";
const explicitPath = process.argv[2];
const targetPath = path.resolve(explicitPath ?? DEFAULT_FONT_PATH);

function fail(reason) {
  console.error(
    [
      `[check-fonts] ${reason}: ${targetPath}`,
      "Font ini sengaja tidak di-commit karena public/fonts/Pally-FFL.txt melarang distribusi di repo publik.",
      `Sediakan berkas WOFF2 yang valid di ${DEFAULT_FONT_PATH} jika ingin memakai Pally.`,
    ].join("\n"),
  );
  process.exit(1);
}

if (!existsSync(targetPath)) {
  if (explicitPath) fail("File font Pally tidak ditemukan");
  process.exit(0);
}

const stat = statSync(targetPath);
if (!stat.isFile() || stat.size < 4) {
  fail("File font Pally tidak valid atau kosong");
}

const header = Buffer.alloc(4);
const fd = openSync(targetPath, "r");
try {
  const bytesRead = readSync(fd, header, 0, 4, 0);
  if (bytesRead < 4 || header.toString("ascii") !== "wOF2") {
    fail("Header file bukan WOFF2 valid (wOF2)");
  }
} finally {
  closeSync(fd);
}
