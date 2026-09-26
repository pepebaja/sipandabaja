# Addendum — Modul Metode Pemilihan (E-Katalog/Non E-Katalog) & Penilaian Kinerja PPBJ

Dokumen ini melengkapi `SIPANDA-Spesifikasi-Sistem.md` secara **additive** (tidak mengubah isi dokumen Phase 1 yang sudah ada). Perubahan skema database terkait ada di migrasi `010_kinerja_dan_ekatalog.sql`.

---

## 1. Rekap Metode Pemilihan Penyedia (E-Katalog vs Non E-Katalog)

- Setiap **metode pengadaan** (master data) diberi atribut `kategori_metode`: `E_KATALOG` atau `NON_EKATALOG`. Admin dapat menambah metode baru dan mengklasifikasikannya langsung di menu Master Data — klasifikasi tidak pernah dihitung manual per transaksi.
- Seed awal: **E-Purchasing** → E-Katalog; seluruh metode lain (Pengadaan Langsung, Penunjukan Langsung, Tender Cepat, Tender, Seleksi, Swakelola) → Non E-Katalog. Admin dapat mengubah pemetaan ini bila ada metode baru (mis. Toko Daring) tanpa migrasi tambahan.
- Rekap dihitung dinamis lewat view `v_rekap_metode_pemilihan`: jumlah paket & total nilai (pagu maupun kontrak) per kategori, per Tahun+Tahapan, dan dapat difilter per PPBJ.
- **Tampilan**: menu baru **Monitoring → Rekap Metode Pemilihan**, berisi donut chart (jumlah paket) + bar chart (nominal), dengan tabel rincian per metode di bawahnya. Difilter sesuai standar filter SIPANDA (Tahun, Tahapan, dll).

## 2. Penilaian Kinerja PPBJ

### 2.1 Sumber Data
Dihitung dari perbandingan:
1. **Jumlah paket** RUP Penyedia & RUP Swakelola **vs** jumlah paket yang sudah memiliki realisasi.
2. **Nominal** pagu RUP Penyedia & RUP Swakelola **vs** total nilai realisasi.
3. **Distribusi metode**: jumlah & nominal paket E-Katalog vs Non E-Katalog (dari Bagian 1).

View pendukung: `v_rekap_rup_vs_realisasi` dan `v_rekap_metode_pemilihan` (keduanya read-only, hasil agregasi langsung dari `rup`, `paket_pengadaan`, `realisasi`, `kontrak` — bukan tabel tersimpan yang bisa basi).

### 2.2 Skor Kinerja (formula default, bobot configurable)
Disimpan di tabel `konfigurasi_penilaian_kinerja` (default: 40% realisasi jumlah paket, 40% realisasi nominal, 20% ketepatan pemilihan metode) sehingga dapat disesuaikan dari Pengaturan tanpa ubah kode:

```
skor_jumlah_paket   = (jumlah_paket_terealisasi / jumlah_paket_rup) × 100
skor_nominal        = (total_nilai_realisasi / total_pagu_rup) × 100
skor_ketepatan_metode = 100 − |persentase_ekatalog_aktual − persentase_ekatalog_target|
                        -- persentase_ekatalog_target diisi Admin di Pengaturan (opsional; default 100
                        -- artinya makin tinggi porsi E-Katalog makin baik, sesuai kebijakan pengadaan)

skor_kinerja = (skor_jumlah_paket   × bobot_realisasi_jumlah_paket
              + skor_nominal        × bobot_realisasi_nominal
              + skor_ketepatan_metode × bobot_ketepatan_metode) / 100
```
Guard pembagian oleh nol mengikuti pola yang sama seperti KPI dashboard (Section M dokumen utama): jika `jumlah_paket_rup = 0`, skor komponen terkait ditampilkan "-" dan tidak menghasilkan error/NaN.

### 2.3 Narasi Otomatis (contoh template)
```
"Pada {periode_label}, PPBJ {nama_ppbj} menangani {jumlah_paket_rup_penyedia} paket RUP Penyedia
dan {jumlah_paket_rup_swakelola} paket RUP Swakelola dengan total pagu Rp{total_pagu}. Realisasi
tercatat sebesar Rp{total_realisasi} ({persentase_realisasi}% dari pagu), mencakup
{jumlah_paket_terealisasi} dari {jumlah_paket_rup} paket. Dari sisi metode pemilihan,
{persentase_ekatalog}% paket diproses melalui E-Katalog dan {persentase_non_ekatalog}% melalui
metode non E-Katalog. Skor kinerja periode ini: {skor_kinerja}/100."
```
Jika data kosong pada periode terpilih → narasi fallback yang sama seperti dashboard utama: *"Belum terdapat data yang tersedia pada periode dan tahapan anggaran yang dipilih."*

### 2.4 Alur Generate & Unduh
```
Pilih PPBJ + Tahun + Tahapan + Periode (Bulanan/Triwulanan/Semesteran/Tahunan)
        ↓
Sistem query v_rekap_rup_vs_realisasi + v_rekap_metode_pemilihan
        ↓
Hitung skor_kinerja (server-side, memakai bobot dari konfigurasi_penilaian_kinerja)
        ↓
Susun narasi otomatis dari template + data aktual
        ↓
Render infografis (KPI ringkas + donut/bar chart perbandingan) → PDF atau PPTX
        ↓
Simpan snapshot ke penilaian_kinerja_ppbj (angka + narasi + file_url) — untuk riwayat & audit
        ↓
Sediakan tombol "Unduh" (PDF/PPTX) di menu Laporan → Penilaian Kinerja PPBJ
```
Snapshot disimpan (bukan hanya dihitung ulang tiap saat) khusus untuk modul ini karena hasilnya adalah **dokumen resmi yang diunduh** — perlu riwayat versi yang konsisten dengan apa yang pernah diunduh, sejalan dengan prinsip audit trail SIPANDA. Perhitungan live tetap tersedia di dashboard/monitoring melalui view.

### 2.5 Modul Menu Baru
- **Monitoring → Rekap Metode Pemilihan** (Bagian 1)
- **Laporan → Penilaian Kinerja PPBJ** (generate baru + riwayat unduhan)
- **Master Data → Metode Pengadaan**: tambah kolom kategori (E-Katalog/Non E-Katalog) pada form yang sudah ada
- **Pengaturan → Konfigurasi Penilaian Kinerja**: atur bobot & target persentase E-Katalog

### 2.6 Permission Baru
`kinerja.view` (VIEWER ke atas), `kinerja.generate` (PPBJ & ADMIN) — sudah ditambahkan ke seed `role_permissions` pada migrasi 009/010.

---

## Implementasi Teknis Tambahan (Phase 7/10 pada roadmap)
- Export PPT: disarankan library `pptxgenjs` (jalan di server Node/Next.js API route).
- Export PDF: konsisten dengan mekanisme export PDF laporan lain (`@react-pdf` atau render HTML→PDF di server), agar identitas visual (logo, warna) seragam dengan laporan SIPANDA lainnya.
- File hasil export disimpan di Supabase Storage (bucket privat), `file_url` di tabel menyimpan path, akses diunduh lewat signed URL bertenggat singkat — bukan public URL permanen.
