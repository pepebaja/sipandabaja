-- =========================================================
-- SIPANDA — 002 Master Data
-- =========================================================

-- ---------------------------------------------------------
-- Tahun Anggaran & Tahapan Anggaran (configurable, not hard-coded)
-- ---------------------------------------------------------
create table tahun_anggaran (
  id           uuid primary key default gen_random_uuid(),
  tahun        integer not null unique check (tahun between 2000 and 2100),
  status_aktif boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table tahapan_anggaran (
  id                 uuid primary key default gen_random_uuid(),
  tahun_anggaran_id  uuid not null references tahun_anggaran(id) on delete restrict,
  nama               text not null check (nama in ('MURNI','PERGESERAN','PERUBAHAN')),
  urutan             smallint not null,               -- 1=MURNI, 2=PERGESERAN, 3=PERUBAHAN
  status_aktif       boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (tahun_anggaran_id, nama)
);

-- Only one (tahun, tahapan) combination may be the globally "active context"
-- at a time; enforced via partial unique index rather than a boolean flag race.
create unique index ux_tahapan_anggaran_single_active
  on tahapan_anggaran (status_aktif)
  where status_aktif = true;
-- NOTE: if multiple simultaneously-active tahapan across different tahun should
-- be allowed (e.g. closing out 2026 while opening 2027), drop this index and
-- manage "active context" purely at the application/session level instead.

-- ---------------------------------------------------------
-- Struktur anggaran berjenjang: Program -> Kegiatan -> Sub Kegiatan -> Belanja
-- ---------------------------------------------------------
create table program (
  id                 uuid primary key default gen_random_uuid(),
  tahun_anggaran_id  uuid not null references tahun_anggaran(id) on delete restrict,
  tahapan_anggaran_id uuid not null references tahapan_anggaran(id) on delete restrict,
  kode               text not null,
  nama               text not null,
  urusan             text,
  bidang_urusan      text,
  status_aktif       boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (tahun_anggaran_id, tahapan_anggaran_id, kode)
);

create table kegiatan (
  id           uuid primary key default gen_random_uuid(),
  program_id   uuid not null references program(id) on delete restrict,
  kode         text not null,
  nama         text not null,
  status_aktif boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (program_id, kode)
);

create table sub_kegiatan (
  id           uuid primary key default gen_random_uuid(),
  kegiatan_id  uuid not null references kegiatan(id) on delete restrict,
  kode         text not null,
  nama         text not null,
  status_aktif boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (kegiatan_id, kode)
);

create table belanja (
  id              uuid primary key default gen_random_uuid(),
  sub_kegiatan_id uuid not null references sub_kegiatan(id) on delete restrict,
  kode_rekening   text not null,
  uraian_belanja  text not null,
  status_aktif    boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (sub_kegiatan_id, kode_rekening)
);

-- ---------------------------------------------------------
-- Sumber Dana
-- ---------------------------------------------------------
create table sumber_dana (
  id           uuid primary key default gen_random_uuid(),
  nama         text not null unique,
  keterangan   text,
  status_aktif boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------
-- Master configurable lists (bukan enum hard-code, agar bisa
-- ditambah/nonaktifkan dari menu Master Data)
-- ---------------------------------------------------------
create table jenis_pengadaan (
  id           uuid primary key default gen_random_uuid(),
  kode         text not null unique,
  nama         text not null,
  urutan       smallint not null default 0,
  status_aktif boolean not null default true
);

create table metode_pengadaan (
  id           uuid primary key default gen_random_uuid(),
  kode         text not null unique,
  nama         text not null,
  urutan       smallint not null default 0,
  status_aktif boolean not null default true
);

create table status_paket (
  id           uuid primary key default gen_random_uuid(),
  kode         text not null unique,
  nama         text not null,   -- RUP, Persiapan, Proses Pengadaan, Pemilihan, Kontrak,
                                  -- Pelaksanaan, Selesai, BAST, Pembayaran,
                                  -- Selesai Administrasi, Dibatalkan (seed data, editable)
  urutan       smallint not null default 0,
  is_final     boolean not null default false,  -- true untuk "Selesai Administrasi"/"Dibatalkan"
  status_aktif boolean not null default true
);

-- ---------------------------------------------------------
-- Penyedia (master)
-- ---------------------------------------------------------
create table penyedia (
  id            uuid primary key default gen_random_uuid(),
  nama_penyedia text not null,
  nib           text,
  npwp          text,
  alamat        text,
  kontak        text,
  jenis_usaha   text,
  status_aktif  boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------
-- Profil SKPD (Pengaturan) — single-tenant per deployment
-- ---------------------------------------------------------
create table profil_skpd (
  id         uuid primary key default gen_random_uuid(),
  nama_skpd  text not null,
  alamat     text,
  logo_url   text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------
create trigger trg_updated_at_tahun_anggaran before update on tahun_anggaran
  for each row execute function sipanda_set_updated_at();
create trigger trg_updated_at_tahapan_anggaran before update on tahapan_anggaran
  for each row execute function sipanda_set_updated_at();
create trigger trg_updated_at_program before update on program
  for each row execute function sipanda_set_updated_at();
create trigger trg_updated_at_kegiatan before update on kegiatan
  for each row execute function sipanda_set_updated_at();
create trigger trg_updated_at_sub_kegiatan before update on sub_kegiatan
  for each row execute function sipanda_set_updated_at();
create trigger trg_updated_at_belanja before update on belanja
  for each row execute function sipanda_set_updated_at();
create trigger trg_updated_at_sumber_dana before update on sumber_dana
  for each row execute function sipanda_set_updated_at();
create trigger trg_updated_at_penyedia before update on penyedia
  for each row execute function sipanda_set_updated_at();
create trigger trg_updated_at_profil_skpd before update on profil_skpd
  for each row execute function sipanda_set_updated_at();
