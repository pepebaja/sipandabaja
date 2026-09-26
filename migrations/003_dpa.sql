-- =========================================================
-- SIPANDA — 003 DPA & Riwayat Perubahan Anggaran
-- =========================================================

create table dpa (
  id                  uuid primary key default gen_random_uuid(),
  tahun_anggaran_id   uuid not null references tahun_anggaran(id) on delete restrict,
  tahapan_anggaran_id uuid not null references tahapan_anggaran(id) on delete restrict,
  sub_kegiatan_id     uuid not null references sub_kegiatan(id) on delete restrict,
  belanja_id          uuid not null references belanja(id) on delete restrict,
  uraian_belanja      text not null,
  pagu_anggaran       numeric(18,2) not null check (pagu_anggaran >= 0),
  sumber_dana_id      uuid references sumber_dana(id) on delete restrict,
  keterangan          text,
  status              text not null default 'AKTIF'
                        check (status in ('DRAFT','AKTIF','NONAKTIF','DIARSIPKAN')),
  created_by          uuid,          -- references users(id), FK added in 006 after users exists
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  -- satu baris DPA unik per kombinasi tahun+tahapan+belanja
  unique (tahun_anggaran_id, tahapan_anggaran_id, belanja_id)
);

-- Snapshot/versioning: setiap perubahan pagu antar tahapan (Murni -> Pergeseran
-- -> Perubahan) dicatat di sini. dpa itu sendiri TIDAK pernah di-overwrite untuk
-- tahapan yang sudah lewat — tahapan baru = baris dpa baru + baris revisi ini
-- yang menautkan keduanya dan mencatat selisih.
create table dpa_revision (
  id               uuid primary key default gen_random_uuid(),
  dpa_id           uuid not null references dpa(id) on delete cascade,       -- baris dpa (tahapan tujuan/baru)
  dpa_asal_id      uuid references dpa(id) on delete set null,               -- baris dpa (tahapan asal), null jika sub kegiatan/belanja baru
  tahapan_asal     text,             -- MURNI / PERGESERAN / null jika baru
  tahapan_tujuan   text not null,    -- PERGESERAN / PERUBAHAN
  pagu_sebelum     numeric(18,2) not null default 0,
  pagu_sesudah     numeric(18,2) not null,
  selisih          numeric(18,2) generated always as (pagu_sesudah - pagu_sebelum) stored,
  jenis_perubahan  text not null default 'PERUBAHAN_PAGU'
                     check (jenis_perubahan in
                       ('PENAMBAHAN_PROGRAM','PENAMBAHAN_KEGIATAN','PENAMBAHAN_SUB_KEGIATAN',
                        'PENAMBAHAN_BELANJA','PERUBAHAN_PAGU','PENGHAPUSAN','PERUBAHAN_SUMBER_DANA')),
  user_id          uuid,             -- FK added in 006
  catatan          text,
  created_at       timestamptz not null default now()
);

create trigger trg_updated_at_dpa before update on dpa
  for each row execute function sipanda_set_updated_at();

create trigger trg_audit_dpa
  after insert or update or delete on dpa
  for each row execute function sipanda_audit_trigger();
