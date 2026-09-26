# SIPANDA — Phase 5: DPA

## Prasyarat
- Phase 2–4 (migrasi 001–013) sudah dijalankan, project Phase 3 & 4 sudah tergabung.
- Tambahkan dependency `xlsx` (lihat `package.additions.json`) → `npm install`.
- **Timpa** file berikut dari Phase 4 dengan versi di paket ini (superset additive, tidak menghapus perilaku lama):
  - `components/master-data/field-types.ts` (+ tipe `async-select`, `textarea`)
  - `components/master-data/MasterDataForm.tsx` (dukungan tipe baru di atas)
  - Ini juga sekaligus merapikan keterbatasan MVP Phase 4 (field Tahun Anggaran di form Program bisa dipindah ke `async-select` bila diinginkan — lihat catatan di README Phase 4).

## Yang Dibangun

### 1. CRUD DPA (`app/api/dpa/`)
- `GET /api/dpa` — list dengan filter `tahun_anggaran_id`, `tahapan_anggaran_id`, `sub_kegiatan_id`, `status`, pencarian `q`, join ke Program/Kegiatan/Sub Kegiatan/Belanja/Sumber Dana untuk ditampilkan.
- `POST /api/dpa` — buat baris DPA baru (dependent chain Program→Kegiatan→Sub Kegiatan→Belanja di form), dengan validasi server bahwa `belanja_id` benar berada di bawah `sub_kegiatan_id` yang dikirim.
- `PUT /api/dpa/[id]` — **sengaja membatasi** field yang bisa diubah: `uraian_belanja`, `sumber_dana_id`, `keterangan`, `status`. **`pagu_anggaran` TIDAK BISA diedit lewat endpoint ini** — perubahan nilai wajib lewat alur Revisi (lihat bawah), sesuai business rule #6 di dokumen spesifikasi ("jangan overwrite data historis").
- `DELETE /api/dpa/[id]` — soft delete (`status = 'DIARSIPKAN'`), bukan hapus fisik.

### 2. Revisi/Versioning (`app/api/dpa/revisi/route.ts`) — inti Phase 5
Mengimplementasikan STEP I dokumen spesifikasi:
- Tidak pernah `UPDATE` baris `dpa` milik tahapan yang sudah lewat.
- Membuat baris `dpa` **baru** untuk tahapan tujuan (atau memperbarui baris tujuan jika revisi kedua di tahapan yang sama — mis. dua kali revisi dalam satu tahap PERUBAHAN), lalu mencatat `dpa_revision` yang menautkan pagu_sebelum/pagu_sesudah/selisih (selisih dihitung generated column di database).
- Satu transaksi atomik lewat `withAuditContext`.
- UI: tombol **"Revisi"** di setiap baris tabel DPA → `RevisiModal` menampilkan pagu saat ini, pilih Tahapan Tujuan, input Pagu Baru (dengan indikator selisih real-time), Jenis Perubahan, dan Catatan.

### 3. Riwayat Perubahan Anggaran (`/dpa/riwayat`)
Tabel read-only dari `dpa_revision` — Tanggal, Sub Kegiatan/Belanja, Tahapan Asal→Tujuan, Pagu Sebelum/Sesudah/Selisih, User, Catatan. Difilter per Tahun Anggaran.

### 4. Import DPA (`/dpa/import`) — alur Section R
Upload → Validasi → **Preview** → Cek Error → Konfirmasi → Import, dipisah dua endpoint:
- `POST /api/dpa/import/preview` — parse file (`.xlsx`/`.xls`/`.csv` via `xlsx`/SheetJS), menelusuri hierarki Kode Program→Kegiatan→Sub Kegiatan→Kode Rekening untuk tiap baris, mengembalikan daftar baris **tanpa menulis apa pun ke database**. Pesan error mengikuti format spesifikasi, mis. *"Baris 27: Kode Sub Kegiatan belum diisi."*
- `POST /api/dpa/import/commit` — menerima HANYA baris yang sudah lolos validasi (dipilih otomatis oleh UI, baris error tidak pernah dikirim), insert dalam satu transaksi, mencatat `audit_logs` dengan action `IMPORT` dan jumlah baris.
- Duplikat (kombinasi tahun+tahapan+belanja yang sudah ada) ditandai error dengan pesan yang mengarahkan pengguna ke menu **Revisi**, bukan menimpa data lewat import ulang.

Kolom template file: `Kode Program | Kode Kegiatan | Kode Sub Kegiatan | Kode Rekening | Uraian Belanja | Pagu Anggaran | Sumber Dana | Keterangan`.

## Keterbatasan yang Disadari (MVP Phase 5)
- Import belum menyediakan tombol "Unduh Template Excel" — bisa ditambahkan cepat di Phase 11 (Import/Export) dengan menuliskan header di atas sebagai file `.xlsx` kosong.
- `RevisiModal` mengasumsikan `sumber_dana_id` tidak berubah saat revisi murni perubahan pagu; untuk jenis perubahan `PERUBAHAN_SUMBER_DANA`, form saat ini belum menampilkan selector Sumber Dana baru secara terpisah — field ini bisa ditambahkan mengikuti pola `AsyncSelect` yang sudah ada.
- Validasi bisnis "total pagu paket RUP tidak melebihi pagu DPA terkait" (Section I) baru relevan begitu modul RUP (Phase 6) dibangun — belum ditegakkan di Phase 5 karena belum ada data RUP untuk dibandingkan.
