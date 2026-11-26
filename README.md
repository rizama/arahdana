# Arah Dana (`arahdana`) — Fase 1 lokal

Fondasi lokal Express + React/Vite + PostgreSQL. Sembilan kalkulator tersedia melalui UI React dan API lokal.

## Menjalankan

Gunakan Node 24.1.0 dan npm 11.3.0 sesuai engines; instalasi terkunci dengan `npm ci`.
Salin `.env.example` ke `.env`, isi kredensial lokal secara privat. DB dev dan test harus berbeda. Jangan menyimpan `.env` di version control.
Gunakan instance PostgreSQL 16 eksisting; tidak ada container baru.

```sh
npm ci
npm run db:migrate
npm run db:migrate -- --test
npm run typecheck
npm run build
npm test
npm start
```

Buka http://127.0.0.1:3000. `npm run dev` menjalankan Vite pada port 3000 dengan hot reload dan Express internal pada port 3001; Vite meneruskan `/api/*` ke Express. `npm start` tetap menyajikan hasil build dari `dist/`; tidak ada migrasi saat startup.

## Struktur

- `src/server/app.ts`, `security.ts`, `index.ts`: HTTP, CSP, CSRF dan runtime.
- `src/server/db/`: koneksi Drizzle/pg, schema dan runner migrasi eksplisit.
- `src/server/modules/feedback/`: validasi Zod dan insert terparameter.
- `src/web/`: halaman fondasi, CSS Modules dan token financial-design-v1.
- `migrations/`: SQL hasil Drizzle Kit beserta snapshot/journal.
- `tests/api/`: HTTP nyata + PostgreSQL test, bukan mock.

GET `/api/csrf` mengeluarkan token dan cookie signed HttpOnly SameSite=Strict. POST `/api/feedback` membutuhkan Origin sama dengan origin request dan header X-CSRF-Token. Origin kosong ditolak. Cookie menjadi Secure pada HTTPS langsung; trust proxy dimatikan pada runtime lokal. Penerapan reverse proxy nanti membutuhkan review konfigurasi trusted proxy, tidak boleh mengaktifkannya sembarang.

API tidak mencatat payload/kredensial. Feedback bukan endpoint pembacaan publik. CSRF secret acak per proses berarti token lama tidak berlaku setelah restart; UI meminta token setiap submit. Tabel feedback menyimpan email opsional, pesan, konteks path lokal dan timestamp PostgreSQL.

Tes hanya menerima database bernama `menghitung_mimpi_test`; baris yang dibuat tes dihapus berdasarkan ID milik tes tanpa truncate tabel. Form browser demo menulis satu feedback lokal yang sengaja dipertahankan sebagai bukti.

## Batas

Belum ada auth, ledger, deployment atau sertifikasi aksesibilitas. Semua tahap lanjutan menunggu review. Audit runtime nol temuan; Drizzle Kit membawa empat temuan moderate development pada rantai esbuild lama. Jangan menjalankan development tool sebagai server publik. Tidak memakai force downgrade otomatis.


## T-JS-02 — API dan domain

POST `/api/calculate/:slug` mendukung annuity, dana-darurat, properti, kendaraan, barang, menikah, dana-pensiun, pendidikan-anak dan simulasi-kpr. Kontrak input ada di `src/domain/calculators/schemas.ts`; angka harus JSON number finit, tanpa koersi string, nama opsional maksimum 80 code point. Gunakan CSRF cookie/token dan Origin sebagaimana feedback. POST mengembalikan 400 untuk input invalid, 403 untuk CSRF/Origin, 404 untuk slug asing (request terautentikasi CSRF).

GET `/api/education-defaults` menyediakan preset lokal. Helper domain `education.ts` memilih rentang kontinu, mereset jenjang usang, membatasi jenis sekolah dan mengganti seluruh preset ketika region berubah. UI berikutnya harus memakai helper ini pada perubahan form; helper tidak menyimpan state. API menolak jenjang duplikat, terputus, atau terlewati; SD/SMP/SMA tidak tersedia mulai usia 6/12/15 sesuai spesifikasi rebuild. Biaya input manual dan frekuensi SPP 1/2/12 tetap dapat digunakan.

Default formula_policy corrected; archive tersedia dengan metadata pada properti/kendaraan/menikah. Rumus biaya/hasil pendidikan memakai ulang modal awal pada tiap jenjang sesuai model arsip; optimizer dapat melewati batas tabungan satu langkah. Inflasi bertingkat adalah pembanding, tanpa kuirk inflasi ganda arsip. Null pada durasi berarti target tidak ditemukan dalam 100 tahun/1200 bulan. Ini simulasi floating-point, bukan pembukuan transaksi.

Jalankan `npm run build` sebelum `npm test` agar tes HTTP dapat mengakses aset produksi. Tes memakai PostgreSQL test seperti T-JS-01. Tes pembanding Python hanya berjalan jika `ARDA_PARITY_BASELINE` menunjuk ke folder baseline lokal dan memerlukan Python 3. Tes yang membandingkan cuplikan arsip hanya berjalan jika `fixtures/source-excerpts.json` tersedia secara lokal. Runtime memakai JavaScript hasil kompilasi dan dapat berjalan tanpa kedua sumber pembanding tersebut.


## UI Fase 1 — T-JS-03–07

Buka `/` untuk 9 kalkulator, 2 tile Segera Hadir dan 10 episode arsip CeritaUang. `/liburan` dan `/pendidikan` menampilkan penjelasan ramah; keduanya bukan kalkulator aktif. Deep-link 9 kalkulator disajikan oleh Express. Unknown API dan URL asing tetap404.

Form menggunakan CSS Modules, token financial-design-v1, font sistem offline, Rupiah tabular, focus-within pada input Rp, skip link dan reduced motion. Tema disimpan lokal; gagal storage tetap mengizinkan toggle. Hasil memiliki Ringkasan/Timeline/Rekomendasi (KPR: Biaya & Kelayakan), keyboard arrows/Home/End dan swipe. Tabel memiliki region gulir tersendiri, bukan gulir seluruh halaman.

Properti meneruskan harga dan DP melalui query ke KPR; nilai query diverifikasi sebelum prefill. Pendidikan mereset jenjang usang dan mengganti seluruh preset pada perubahan lokasi/jenis; override manual dan frekuensi SPP tetap tersedia. Mengubah asumsi menghapus hasil lama agar tidak menampilkan hasil yang tertinggal.

Ekspor memakai Canvas2D murni, Square1024×1024 atau Story1080×1920, nama opsional, dan tema aktif/Light/Dark. Warna/font dibaca dari token CSS teresolusi, menunggu document.fonts.ready; URL blob dicabut setelah unduhan. Tidak ada screenshot library/CDN. Semua nama dirender sebagai teks React/Canvas. Pilihan tema unduhan tidak mengubah preferensi tema halaman.

Bukti di `evidence/`, contoh unduhan di `examples/`. Validasi PNG (stdlib Python, hanya untuk QA):

```sh
python3 scripts/verify-png.py examples/annuity-square-light.png examples/annuity-square-dark.png examples/annuity-story-light.png examples/annuity-story-dark.png
```

Tes Node berjumlah231 (228 sebelumnya +3 regresi SPA/poster/episode). Bukti browser adalah observasi OpenBot, bukan klaim pengujian Safari/Firefox/alat pembaca layar. Pembesaran CSS200% diuji; native browser zoom belum terverifikasi. See BEHAVIOR-LEDGER.md untuk batas model dan kesiapan fase berikutnya.
