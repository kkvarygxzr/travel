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

## Backlog Terprioritisasi
- **P1 — RC-E batch 4**: sisa field free-text kandidat relasi (kategori/label lain hasil audit)
  — bertahap per field + gate + testing_agent
- **P2**: kredensial nyata Meta/Google/WA/GA4 (menunggu user); migrasi media ke objstore
  (MEDIA_BACKEND masih local); load test (setelah integritas data beres)
- **P2**: batas/anggaran harga per tipe di Master Harga (saran reviewer: sudah ada cap 100 jt/unit)
- **P3 (rapikan terpisah)**: INFO check_nav_map — menu 'users' & 'vehicles' belum punya PAGE_META
  (bukan regresi); preview jumlah cascade sebelum rename di MasterData.jsx (saran reviewer iter_96)

## Next Tasks
1. RC-E batch 4 (field berikutnya sesuai temuan audit)
2. Keputusan user: data produksi / kredensial integrasi nyata
