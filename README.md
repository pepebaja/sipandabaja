# SIPANDA — Phase 4: Master Data

## Prasyarat
- Migrasi 001–012 (Phase 2–3) sudah dijalankan.
- Jalankan `supabase/migrations/013_audit_master_data.sql` di folder ini — menambahkan trigger audit ke seluruh tabel master data (tidak ada di migrasi sebelumnya, ditambahkan additive di Phase 4 karena modul ini yang pertama memutasinya).
- File Phase 3 (`lib/auth`, `lib/db`, `middleware.ts`) sudah tergabung di project.

## Yang Dibangun

### Backend — 1 factory, 11 entitas
Daripada menulis logika CRUD yang sama 11×, seluruh list/search/filter/sort/pagination/create/update/soft-delete ditulis sekali di **`lib/api/master-crud-factory.ts`**, lalu tiap entitas di `app/api/master-data/<entity>/route.ts` dan `[id]/route.ts` hanya memanggilnya dengan konfigurasi (nama tabel, kolom, skema Zod):

```
tahun-anggaran   tahapan-anggaran   program   kegiatan   sub-kegiatan   belanja
sumber-dana      jenis-pengadaan    metode-pengadaan     status-paket   penyedia
```

Setiap endpoint collection mendukung: `?q=` (pencarian ILIKE lintas kolom), `?status_aktif=true|false|all`, `?sortBy=&sortDir=`, `?page=&pageSize=`, dan (untuk entitas berjenjang) `?<parentColumn>=<uuid>` untuk dependent dropdown — mis. `GET /api/master-data/kegiatan?program_id=xxx`.

Semua mutasi (`POST`/`PUT`/`DELETE`) melalui `requirePermission("master.manage")` dan `withAuditContext()` (Phase 3), sehingga tercatat di `audit_logs` dengan user_id, IP, nilai lama/baru.

### Frontend — komponen reusable
- `components/ui/DataTable.tsx` — search, sort, pagination, skeleton loading, empty state, horizontal scroll di mobile
- `components/ui/Modal.tsx`, `components/ui/ConfirmDialog.tsx` (wajib sebelum hapus), `components/ui/Toast.tsx` (feedback "Data berhasil disimpan/diperbarui/dihapus" sesuai Section W)
- `components/master-data/MasterDataForm.tsx` — form generik dari `FieldDef[]` (text/number/checkbox/select/**dependent-select**)
- `components/master-data/DependentSelect.tsx` & `EntityPicker.tsx` — dropdown berjenjang (Program→Kegiatan→Sub Kegiatan→Belanja, Tahun→Tahapan), otomatis reset & nonaktif saat induk kosong
- `components/master-data/MasterDataManager.tsx` — merangkai semua di atas per halaman, tinggal diberi `columns` + `fields` + `endpoint`

### Halaman contoh
Tahun Anggaran, Tahapan Anggaran (dependent ke Tahun), Program (dependent 2 level: Tahun→Tahapan), Kegiatan (dependent ke Program), Sumber Dana, Jenis Pengadaan, Metode Pengadaan (termasuk kategori E-Katalog/Non E-Katalog dari addendum), Status Paket, Penyedia.

**Sub Kegiatan** dan **Belanja** belum dibuatkan halaman terpisah di paket ini — polanya identik dengan `KegiatanClient.tsx` (tinggal ganti endpoint, `parentQueryParam`, dan label), sudah dijelaskan di komentar file tersebut, agar tidak menduplikasi 100+ baris kode yang sama persis.

## Keterbatasan yang Disadari (MVP Phase 4)
- Field `tahun_anggaran_id` di form Program memakai tipe `select` dengan `options: []` kosong (lihat komentar di `ProgramClient.tsx`) — perlu tipe field baru `async-select` (tanpa dependency ke field lain) di Phase 5+ agar konsisten dengan `dependent-select`. Untuk saat ini, isi awal field ini diisi otomatis dari picker halaman lewat `defaultValues`.
- Validasi bisnis lanjutan (mis. business rule #5: paket harus terhubung ke DPA aktif) belum relevan di Phase 4 karena belum ada modul DPA/RUP — menyusul di Phase 5/6.
- Export/print master data (Excel/PDF) menyusul di Phase 11 (Import/Export) sesuai roadmap.
