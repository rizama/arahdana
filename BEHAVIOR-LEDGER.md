# Behavior ledger — JS monolith Fase 1

Status: implementasi lokal T-JS-01–07, menunggu review PM akhir. Referensi Python/SQLite dipertahankan; bukan replika pixel produksi. Tidak ada deployment.

| Alur | Implementasi | Bukti |
|---|---|---|
| Runtime | Express menyajikan dist dan API, satu origin/proses | tests/api/spa.test.ts dan commands.txt |
| Domain | 9 kalkulator TypeScript murni, corrected default + archive, rekomendasi bulanan, inflasi bertingkat, komposisi/status | 228 regresi T-JS-01–02 tetap lulus, oracle81 dan diferensial116 |
| Home/design | financial-design-v1 sage/editorial, CSS Variables + Modules, font offline,9 SVG,2 Segera Hadir | Home test, browser matrix40, screenshots/contrast |
| CeritaUang |10 judul/ID arsip, poster SVG lokal, carousel keyboard-native, playlist; tanpa embed/request YouTube otomatis | tests/web/home.test.tsx, poster API test, browser timing |
| Form umum |7 rute, investasi bulanan/tahunan-awal/akhir, keluarga/tanggungan, DP/inflasi, pensiun usia, menikah simple/13pos | browser40 dan detailed13-row check |
| Pendidikan |rentang kontinu, reset usia6/12/15, region/type replacement, S1semester, manual SPP,3strategi,proporsi4jenjang | domain tests dan browser interaction record |
| KPR |query prefill, fixed/floating, income/NJOP opsional,4rasio,percepatan,7fee | domain/HTTP tests, UI prefill/blank/income flows |
| Hasil |3status teks+simbol, tabs keyboard+synthetic swipe, tabel scroll, komposisi ringkasan+3alternatif, archive/inflasi comparator | browser keyboard/matrix/status checks |
| Nama/PNG |teks React/Canvas, tidak masuk DB,4PNG Square/Story Light/Dark, CSS palette | examples, full CRC/unfilter decoder, visual inspection |
| Feedback |signed CSRF/Origin/Zod ->parameterized PostgreSQL; raw script text tetap data |8HTTP regresi +1synthetic browser row readback |

## Perbedaan/risiko model yang disengaja

- Angka simulasi floating-point; jangan gunakan untuk ledger transaksi. Pembulatan Python ties-to-even dipertahankan pada domain. Rate sangat kecil ditangani dengan log1p/expm1 bila terjadi cancellation.
- Arsip properti/kendaraan/menikah memakai durasi tahun sebagai nominal return; default corrected memakai rate input dan UI menjelaskan alternatifnya.
- Inflasi bertingkat memakai dasar tidak terinflasi ganda. Bukan reproduksi bug pangkat bulan barang atau inflasi ganda pensiun.
- Proyeksi pendidikan mengulang modal awal per jenjang tanpa penarikan; optimizer bisa melewati limit tabungan satu langkah. Usia tepat6/12/15 dan jenjang terputus ditolak sesuai spesifikasi rebuild, lebih ketat daripada Python lama.
- KPR percepatan memakai sisa pokok berjalan,1200bulan/nonamortisasi bound. Fee/rasio adalah model referensi, bukan aturan bank/pajak yang disertifikasi.
- Durasi null berarti tidak ditemukan dalam100tahun/1200bulan, bukan hasil palsu. Nama bukan identitas tersimpan. Semua poster adalah ilustrasi SVG lokal baru.

## Verifikasi & batas

231 tes, typecheck/build exit0; matrix40 Chromium390/1440×Light/Dark,3tabs dibuka setiap kalkulator. Representative text contrast>=6.10:1 dan button>=9.61:1; ini audit pasangan token, bukan sertifikasi a11y. CSSzoom200 dan reduced motion diuji, nativebrowserzoom NOT_RUN. Safari/Firefox, sentuh fisik, screen reader fisik dan beban panjang NOT_RUN.

Satu synthetic feedback dari pengujian browser T-JS-03–07 dipertahankan di DB dev. Tes PostgreSQL membersihkan ID miliknya saja. Tidak menghapus data pengguna.

## Fase 2

Modul finance-ledger dan auth belum dibuat: tidak ada placeholder, route, tabel atau migrasi. Saat mendapat izin terpisah, gunakan BIGINT rupiah/NUMERIC, transaksi atomik, auth/session dan isolasi ownership dalam monolith yang sama. Jangan menyatukan data ledger dengan feedback/simulasi.
