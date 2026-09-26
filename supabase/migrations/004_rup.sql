-- =========================================================
-- SIPANDA — 004 RUP (Penyedia & Swakelola) & Riwayat RUP
-- =========================================================

create table rup (
  id                    uuid primary key default gen_random_uuid(),
  tahun_anggaran_id     uuid not null references tahun_anggaran(id) on delete restrict,
  tahapan_anggaran_id   uuid not null references tahapan_anggaran(id) on delete restrict,
  kode_rup              text not null,
  dpa_id                uuid not null references dpa(id) on delete restrict,
  nama_paket            text not null,
  jenis_rup             text not null check (jenis_rup in ('PENYEDIA','SWAKELOLA')),
  jenis_pengadaan_id    uuid references jenis_pengadaan(id) on delete restrict,
  metode_pengadaan_id   uuid references metode_pengadaan(id) on delete restrict,
  pagu_paket            numeric(18,2) not null check (pagu_paket >= 0),
  sumber_dana_id        uuid references sumber_dana(id) on delete restrict,
  lokasi                text,
  volume                numeric(18,2),
  satuan                text,
  jadwal_pemilihan      date,
  jadwal_mulai          date,
  jadwal_selesai        date,
  spesifikasi           text,
  status_rup            text not null default 'AKTIF'
                          check (status_rup in ('DRAFT','AKTIF','NONAKTIF','DIARSIPKAN')),
  status_aktif          boolean not null default true,
  created_by            uuid,     -- FK added in 006
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  -- Kode RUP unik dalam konteks tahun+tahapan (business rule #3), bukan unik global
  unique (tahun_anggaran_id, tahapan_anggaran_id, kode_rup)
);

create table rup_revision (
  id             uuid primary key default gen_random_uuid(),
  rup_id         uuid not null references rup(id) on delete cascade,
  field_changed  text not null,     -- e.g. 'pagu_paket', 'metode_pengadaan_id', 'jadwal_mulai'
  nilai_sebelum  text,
  nilai_sesudah  text,
  user_id        uuid,              -- FK added in 006
  catatan        text,
  created_at     timestamptz not null default now()
);

create trigger trg_updated_at_rup before update on rup
  for each row execute function sipanda_set_updated_at();

create trigger trg_audit_rup
  after insert or update or delete on rup
  for each row execute function sipanda_audit_trigger();
