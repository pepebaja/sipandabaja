-- =========================================================
-- SIPANDA — 007 Indexes
-- =========================================================

-- DPA
create index ix_dpa_tahun          on dpa (tahun_anggaran_id);
create index ix_dpa_tahapan        on dpa (tahapan_anggaran_id);
create index ix_dpa_tahun_tahapan  on dpa (tahun_anggaran_id, tahapan_anggaran_id);
create index ix_dpa_sub_kegiatan   on dpa (sub_kegiatan_id);
create index ix_dpa_belanja        on dpa (belanja_id);
create index ix_dpa_status         on dpa (status);

-- Program hierarchy
create index ix_program_tahun_tahapan on program (tahun_anggaran_id, tahapan_anggaran_id);
create index ix_kegiatan_program      on kegiatan (program_id);
create index ix_sub_kegiatan_kegiatan on sub_kegiatan (kegiatan_id);
create index ix_belanja_sub_kegiatan  on belanja (sub_kegiatan_id);

-- RUP
create index ix_rup_tahun          on rup (tahun_anggaran_id);
create index ix_rup_tahapan        on rup (tahapan_anggaran_id);
create index ix_rup_tahun_tahapan  on rup (tahun_anggaran_id, tahapan_anggaran_id);
create index ix_rup_kode_rup       on rup (kode_rup);
create index ix_rup_dpa            on rup (dpa_id);
create index ix_rup_jenis          on rup (jenis_rup);
create index ix_rup_metode         on rup (metode_pengadaan_id);
create index ix_rup_status         on rup (status_rup);

-- Pelaksanaan
create index ix_paket_status       on paket_pengadaan (status_paket_id);
create index ix_kontrak_paket      on kontrak (paket_pengadaan_id);
create index ix_kontrak_penyedia   on kontrak (penyedia_id);
create index ix_realisasi_paket    on realisasi (paket_pengadaan_id);
create index ix_realisasi_tanggal  on realisasi (tanggal_realisasi);
create index ix_realisasi_periode  on realisasi (tahun, triwulan, semester);

-- Penyedia
create index ix_penyedia_status    on penyedia (status_aktif);

-- Audit log — query umum: per user, per modul, per tanggal
create index ix_audit_user         on audit_logs (user_id);
create index ix_audit_module       on audit_logs (module);
create index ix_audit_created_at   on audit_logs (created_at);

-- Smart search (Kode RUP, Nama Paket, Penyedia, Program dst.) — trigram untuk ILIKE cepat
create extension if not exists pg_trgm;
create index ix_rup_nama_paket_trgm   on rup using gin (nama_paket gin_trgm_ops);
create index ix_rup_kode_rup_trgm     on rup using gin (kode_rup gin_trgm_ops);
create index ix_penyedia_nama_trgm    on penyedia using gin (nama_penyedia gin_trgm_ops);
create index ix_kontrak_nomor_trgm    on kontrak using gin (nomor_kontrak gin_trgm_ops);
create index ix_program_nama_trgm     on program using gin (nama gin_trgm_ops);
create index ix_kegiatan_nama_trgm    on kegiatan using gin (nama gin_trgm_ops);
create index ix_sub_kegiatan_nama_trgm on sub_kegiatan using gin (nama gin_trgm_ops);
