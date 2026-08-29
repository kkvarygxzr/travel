# PRD — RahazaTrans ERP (lanjutan repo nowfersiadeew/rahaza)

## Problem Statement Asli (sesi 2026-08-29)
Lanjutan development ERP existing (FARM stack) dengan disiplin guardrail (gate wajib HIJAU penuh).
5 keluhan: (1) booking manual ERP tidak bekerja benar; (2) harga armada diatur di 2 halaman
berbeda tanpa master; (3) notif merah "image hilang" palsu; (4) UX & logika driver cacat
(aksi jemput buruk, tak ada upcoming trips); (5) banyak field custom-input yang seharusnya
relasi antar-collection (pelanggaran SSOT). Disiplin: repro dulu → fix minimal → gate HIJAU →
testing_agent 0 bug. Bahasa kerja & UI: Indonesia.

## Arsitektur
- FastAPI (port 8001, prefix /api) · React + shadcn (port 3000) · MongoDB (MONGO_URL/DB_NAME)
- Guardrail: `bash scripts/gate.sh` — kini **46 gate PASS, 0 FAIL, 0 SKIP** (receipt: memory/GATE_RECEIPT.md)
- Seed demo: `bash scripts/seed_reset.sh`; kredensial: memory/test_credentials.md (semua demo12345)
- SETTINGS_ENCRYPTION_KEY_B64 baru digenerate (data seed, tanpa data lama terenkripsi)

## User Personas
Owner (kontrol penuh + Pengaturan/Master Harga), Ops Admin (booking/dispatch), Marketing (CMS), Driver (workspace tugas).

## Yang Diimplementasikan Sesi Ini (2026-08-29) — BUG-0132..0136
- **RC-A (P0)**: `/api/pricing/quote` kini memakai `resolve_day_rate` (tarif unit > tipe > default)
  → angka "Hitung Otomatis" = angka yang ditagih mesin. Edge teruji: overlap 400, harga 0 auto,
  unit tanpa tarif → tarif tipe.
- **RC-B (P0)**: Master Harga TUNGGAL — panel "Tarif Khusus per Unit" di Pengaturan
  (`GET/PATCH /api/pricing/unit-rates`); `day_rate`/`price_from` dihapus dari jalur tulis armada
  (schemas + router + form FE read-only). Guardrail baru **INV-PRICE-02** (verify_price_master.py).
- **RC-C (P1)**: `media_store.check_file()` tri-state per storage_backend; `/api/media/health`
  mengembalikan missing (merah, terbukti hilang) vs unknown (kuning + alasan). FE MediaBrowser 2 banner.
- **RC-D (P1)**: Driver Workspace v2 — Trip Aktif + Upcoming Trips (hari ini/mendatang, urut jadwal)
  + Riwayat; stepper standby→berangkat jemput(odometer)→penumpang naik(`/trips/{id}/status` on_trip,
  state machine TUNGGAL)→tiba→check-out odometer (jalur checkout SSOT). RBAC driver tetap.
- **RC-E batch 1 (P1)**: `bookings.destination` = relasi master `destinations` — validator
  `refs.destination_or_400` (create/group/update, nilai kanonik), selector FE `DestinationSelect`
  (3 dialog), endpoint `GET /api/bookings/destination-options`, migrasi
  `scripts/migrate_booking_destinations.py` (master ops status draft — tak tayang di web),
  seed dikanonikkan. Guardrail baru **INV-REF-02** (verify_ssot_relations.py, statik+runtime).
- Verifikasi: testing_agent iteration_94 — backend 14/14, frontend 4/4 alur, 0 bug fungsional.
  Suite regresi baru: backend/tests/backend_test_rc_abcde.py.

- **RC-E batch 2 (2026-08-29 sesi 2, BUG-0137)**: `bookings.origin` = relasi master baru
  `pickup_points` (validator + quick-add satu pintu + selector FE + seed + migrasi
  `scripts/migrate_ssot_batch2.py`); `leads.destination` ERP tervalidasi master (selector CRM),
  jalur publik normalisasi lunak; **Alarm Harga Aneh** di Master Harga (deviasi unit vs tipe
  >±50% → warning kuning + toast). Guardrail INV-REF-02/INV-PRICE-02 diperluas.
  Verifikasi: testing_agent iteration_95 backend 100% + frontend 100%; gate HIJAU 46/46.

- **RC-E batch 3 (2026-08-29 sesi 3+4, BUG-0138 — TUNTAS)**: destinasi PENAWARAN divalidasi
  master (`quotations.py` via `destination_or_400`, update hanya-bila-diubah); form penawaran
  web publik pakai select dari endpoint publik baru `GET /api/public/destination-options`
  (backend publik tetap lunak via `destination_normalize`); halaman **Master Data**
  `/app/masterdata` (owner+ops_admin, RBAC 3 lapis) — RENAME CASCADE ke bookings/leads/
  quotations + NONAKTIF (`active`/`ops_active`) menyembunyikan dari semua selector;
  **Lead→Booking**: `POST /api/leads/{id}/prepare-booking` + tombol "Jadikan Booking" di drawer
  CRM → BookingFormDialog prefilled → lead otomatis `won`. INV-REF-02 diperluas (17 cek).
  Sesi 4 (ritual penutup): **BUG-0139** diperbaiki (mutasi self-test B01 `total_amount`
  ter-commit di `PublicBookingSubmit` + probe `masterdata` di SECTION_PROBES + empty-state
  select Quotation.jsx + split `schemas_partner.py` agar schemas.py < 800 baris).
  Verifikasi: gate HIJAU penuh **46 PASS 0 FAIL 0 SKIP**; testing_agent iteration_96
  backend 15/15 + frontend 4/4, 0 bug (suite: backend/tests/backend_test_ssot_batch3.py).

- **RC-E batch 4 + Preview Cascade (2026-08-29 sesi 5, BUG-0140 — TUNTAS)**: normalisasi LUNAK
  menutup semua jalur tulis publik/inbound — `refs.origin_normalize` BARU; pemesanan online
  (`booking_public.create_booking`) menormalkan origin+destination; lead landing menormalkan
  origin; lead ads menormalkan destination (cocok master → kanonik, di luar master → diterima
  apa adanya). **Preview Cascade** di /app/masterdata: panel konfirmasi menampilkan jumlah
  booking/lead/penawaran yang ikut berubah SEBELUM rename (`md-confirm-*`); master destinasi
  kini melaporkan `used_by_quotations`. Guard INV-REF-02 → 23 cek (+5 statik, +1 runtime probe
  DB). Verifikasi: gate HIJAU 46/46; testing_agent iteration_97 backend 7/7 + frontend 2/2,
  0 bug (suite: backend/tests/backend_test_ssot_batch4.py).

- **RC-E batch 5 + Ekspor + Merge (2026-08-29 sesi 6, BUG-0141 — TUNTAS)**: master KOTA baru
  (`cities`, cty_) — `customers.city` & `partners.city` divalidasi KERAS `refs.city_or_400`
  (kanonik; quick-add `POST /api/cities`; selector FE `CitySelect` cf-city/pf-city; kelola +
  rename cascade + toggle di `/api/master/cities`); `vehicle_type` lead landing & booking publik
  dinormalkan LUNAK `refs.vehicle_type_normalize` vs SSOT tipe armada; **Gabung destinasi
  kembar** `POST /api/master/destinations/{id}/merge` (cascade booking/lead/penawaran ke target,
  sumber nonaktif + `merged_into`, badge "Digabung →" di UI, tanpa penghapusan data); **Ekspor
  Excel** `GET /api/master/export` (3 sheet + pemakaian) + tombol `md-export-excel`;
  seed + `scripts/migrate_ssot_batch5.py`. Guard INV-REF-02 → **30 cek**. Verifikasi: gate
  HIJAU 46/46; testing_agent iteration_98 backend 19/19 + frontend semua skenario, 0 bug
  (suite: backend/tests/backend_test_ssot_batch5.py).

- **Batch 6: Undo Gabungan + Kota Bengkel (2026-08-29 sesi 7, BUG-0142 — TUNTAS)**: merge kini
  mencatat `merged_moved` (id dokumen yang ikut pindah) → `POST /api/master/destinations/{id}/
  unmerge` mengembalikan dokumen tercatat (yang diubah manual sesudah merge dilewati/`skipped`)
  + sumber aktif kembali; UI tombol "Batalkan Gabungan" (`md-unmerge-*`) dgn panel konfirmasi —
  undo TANPA sentuh DB. `workshops.city` ikut master `cities` (city_or_400 create+update,
  `CitySelect` wsh-city, rename kota cascade+usage+Excel mencakup bengkel). Guard INV-REF-02 →
  **34 cek**. Verifikasi: gate HIJAU 46/46; testing_agent iteration_99 backend 11/11 + frontend
  end-to-end, 0 bug (suite: backend/tests/backend_test_ssot_batch6.py).

## Backlog Terprioritisasi
- **P1 — RC-E batch 7 (opsional)**: sisa kandidat kecil hasil audit bila ditemukan
- **P2**: kredensial nyata Meta/Google/WA/GA4 (menunggu user); migrasi media ke objstore
  (MEDIA_BACKEND masih local); load test (setelah integritas data beres)
- **P2**: batas/anggaran harga per tipe di Master Harga (saran reviewer: sudah ada cap 100 jt/unit)
- **P3 (rapikan terpisah)**: INFO check_nav_map — menu 'users' & 'vehicles' belum punya PAGE_META
  (bukan regresi); TTL cache utk `refs.*_or_400/normalize` & aggregation `$facet` utk usage count
  Master Data/ekspor; bulk_write utk unmerge bila dokumen ratusan; `skipped_ids` rinci di respons
  unmerge (saran reviewer iter_99, skala sekarang aman)

## Next Tasks
1. Fitur berikutnya sesuai arahan user (backlog SSOT praktis habis)
2. Keputusan user: data produksi / kredensial integrasi nyata
