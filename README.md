# SIPANDA — Phase 6: RUP

## Prasyarat
- Phase 2–5 (migrasi 001–013) sudah dijalankan; project Phase 3–5 sudah tergabung.
- Jalankan `supabase/migrations/014_konfigurasi_validasi_rup.sql` (tabel konfigurasi validasi pagu).
- **Timpa** `app/api/dpa/route.ts` dengan versi di paket ini (superset additive dari Phase 5: hanya menambah filter `belanja_id`).
- Tidak ada dependency baru (memakai `xlsx` dari Phase 5).
- Hotfix middleware (`sipanda-hotfix-middleware.zip`) tetap perlu diterapkan terlebih dulu bila error 500 di Vercel belum teratasi.

## Yang Dibangun

### 1. CRUD RUP (`/api/rup`, `/api/rup/[id]`)
- **RUP Penyedia dan RUP Swakelola** adalah satu tabel (`rup.jenis_rup`), ditampilkan lewat tab dan halaman terpisah: `/rup`, `/rup/penyedia`, `/rup/swakelola`.
- `POST /api/rup` melakukan dua hal dalam satu transaksi: (1) validasi pagu terhadap DPA, (2) insert `rup` **dan** otomatis membuat baris `paket_pengadaan` pendamping dengan status awal `RUP`. Dengan begitu view rekap dari migrasi 010 (`v_rekap_rup_vs_realisasi`, `v_rekap_metode_pemilihan`) langsung mencakup setiap paket, dan Phase 7 tinggal mengubah statusnya.
- `PUT /api/rup/[id]` mencatat **setiap field yang berubah** ke `rup_revision` (nilai sebelum/sesudah, user). Berbeda dari DPA yang membuat baris baru per tahapan: satu baris RUP mewakili satu paket yang berkembang, jadi cukup dicatat diff per field.
- `DELETE` = arsip (`status_rup = DIARSIPKAN`, `status_aktif = false`); paket yang diarsipkan tidak lagi dihitung sebagai pemakai pagu DPA.

### 2. Relasi ke DPA dan validasi pagu (yang sebelumnya belum ditegakkan)
- `lib/rup/pagu-check.ts`: total pagu paket RUP aktif pada satu baris DPA dibandingkan dengan `dpa.pagu_anggaran`.
- **Configurable** lewat tabel `konfigurasi_validasi_rup`: `blokir_pagu_rup_melebihi_dpa` (default `true` = tolak) dan `toleransi_persen` (default 0). Bila blokir dimatikan, melebihi pagu hanya memunculkan peringatan (toast) tetapi data tetap tersimpan, sesuai catatan spesifikasi bahwa aturan bisnis tidak boleh terlalu kaku.
- Saat **edit**, RUP itu sendiri dikecualikan dari total yang terpakai agar tidak terhitung ganda.
- `GET /api/rup/dpa-lookup`: dari pilihan Program→Kegiatan→Sub Kegiatan→Belanja, mencari DPA yang cocok dan mengembalikan pagu, total terpakai, dan **sisa pagu**; form RUP menampilkannya dan memberi peringatan langsung saat pagu paket melebihi sisa. Ini hanya kenyamanan di UI; penegakan sesungguhnya di server.
- Penyimpanan tanpa DPA yang cocok ditolak: tombol Simpan nonaktif sampai DPA ditemukan.

### 3. Import RUP (`/rup/import`)
Alur Upload → Validasi → Preview → Cek Error → Konfirmasi → Import, sama seperti DPA.
- Preview menelusuri Kode Program→Kegiatan→Sub Kegiatan→Kode Rekening ke baris DPA, memeriksa Kode RUP unik (Tahun+Tahapan), kode Jenis/Metode Pengadaan, Sumber Dana, dan pagu per baris.
- **Commit menghitung ulang pagu secara kumulatif per DPA** dan menolak duplikat Kode RUP di dalam file, karena beberapa baris dapat merujuk DPA yang sama dan lolos sendiri-sendiri padahal totalnya melebihi pagu. Jika ada pelanggaran, tidak ada data yang tersimpan sama sekali (atomik).
- Audit log `IMPORT` dengan jumlah baris.

### 4. Monitoring RUP (`/rup/monitoring`)
KPI: total paket dan pagu, RUP Penyedia vs Swakelola, E-Katalog vs Non E-Katalog (jumlah, nominal, persentase dengan guard pembagian nol), serta sebaran paket per status.

## Keterbatasan yang Disadari
- Preview import memvalidasi pagu per baris terhadap kondisi database saat itu; pelanggaran kumulatif baru terdeteksi saat commit (bukan di tabel preview). Bisa dipindah ke preview bila dibutuhkan.
- Pengaturan `konfigurasi_validasi_rup` belum punya halaman UI (menyusul di Phase Pengaturan); sementara diubah lewat SQL, mis. `update konfigurasi_validasi_rup set blokir_pagu_rup_melebihi_dpa = false;`.
- Perubahan RUP antar tahapan (Murni→Pergeseran→Perubahan) saat ini terekam sebagai edit per field pada baris yang sama dan RUP dikaitkan ke satu `dpa_id`. Menyalin paket RUP ke tahapan berikutnya (mirip alur Revisi DPA) belum dibuat.
- Riwayat `rup_revision` sudah tercatat tetapi belum ada halaman untuk menampilkannya.
