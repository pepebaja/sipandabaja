-- =========================================================
-- SIPANDA — 013 Audit Trigger untuk Tabel Master Data
-- =========================================================
-- Migrasi 003–005 memasang sipanda_audit_trigger() hanya pada tabel
-- transaksional inti (dpa, rup, paket_pengadaan, kontrak, realisasi).
-- Perubahan master data (status_paket, metode_pengadaan, penyedia, dst.)
-- juga tergolong "perubahan data penting" (aturan bisnis #7: "Setiap
-- perubahan data penting dicatat dalam audit log"), jadi ditambahkan di
-- sini secara additive — tidak mengubah struktur tabel yang sudah ada.

create trigger trg_audit_program          after insert or update or delete on program
  for each row execute function sipanda_audit_trigger();
create trigger trg_audit_kegiatan         after insert or update or delete on kegiatan
  for each row execute function sipanda_audit_trigger();
create trigger trg_audit_sub_kegiatan     after insert or update or delete on sub_kegiatan
  for each row execute function sipanda_audit_trigger();
create trigger trg_audit_belanja          after insert or update or delete on belanja
  for each row execute function sipanda_audit_trigger();
create trigger trg_audit_sumber_dana      after insert or update or delete on sumber_dana
  for each row execute function sipanda_audit_trigger();
create trigger trg_audit_jenis_pengadaan  after insert or update or delete on jenis_pengadaan
  for each row execute function sipanda_audit_trigger();
create trigger trg_audit_metode_pengadaan after insert or update or delete on metode_pengadaan
  for each row execute function sipanda_audit_trigger();
create trigger trg_audit_status_paket     after insert or update or delete on status_paket
  for each row execute function sipanda_audit_trigger();
create trigger trg_audit_penyedia         after insert or update or delete on penyedia
  for each row execute function sipanda_audit_trigger();
create trigger trg_audit_profil_skpd      after insert or update or delete on profil_skpd
  for each row execute function sipanda_audit_trigger();
create trigger trg_audit_tahun_anggaran   after insert or update or delete on tahun_anggaran
  for each row execute function sipanda_audit_trigger();
create trigger trg_audit_tahapan_anggaran after insert or update or delete on tahapan_anggaran
  for each row execute function sipanda_audit_trigger();
