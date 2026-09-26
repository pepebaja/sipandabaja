-- =========================================================
-- SIPANDA — 005 Pelaksanaan Pengadaan (Paket, Kontrak, Realisasi)
-- =========================================================

create table paket_pengadaan (
  id                      uuid primary key default gen_random_uuid(),
  rup_id                  uuid not null unique references rup(id) on delete restrict,
  status_paket_id         uuid not null references status_paket(id) on delete restrict,
  persentase_realisasi_fisik numeric(5,2) not null default 0
                            check (persentase_realisasi_fisik between 0 and 100),
  keterangan              text,
  created_by              uuid,   -- FK added in 006
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create table kontrak (
  id                  uuid primary key default gen_random_uuid(),
  paket_pengadaan_id  uuid not null references paket_pengadaan(id) on delete restrict,
  penyedia_id         uuid not null references penyedia(id) on delete restrict,
  nomor_kontrak       text not null,
  tanggal_kontrak     date not null,
  nilai_kontrak       numeric(18,2) not null check (nilai_kontrak >= 0),
  tanggal_mulai       date,
  tanggal_selesai     date,
  created_by          uuid,   -- FK added in 006
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Business rule #4 (opsional/configurable): keunikan nomor kontrak dalam konteks
-- yang sama. Diimplementasikan sebagai partial unique index yang dapat di-drop
-- dari migrasi lanjutan bila fitur toggle-nya dinonaktifkan di Pengaturan.
create unique index ux_kontrak_nomor_per_tahun on kontrak (nomor_kontrak)
  where nomor_kontrak is not null;

create table realisasi (
  id                  uuid primary key default gen_random_uuid(),
  paket_pengadaan_id  uuid not null references paket_pengadaan(id) on delete restrict,
  tanggal_realisasi   date not null,
  -- derivasi otomatis dari tanggal — TIDAK PERNAH diinput manual (aturan bisnis #7)
  tahun    integer generated always as (extract(year  from tanggal_realisasi)::int) stored,
  bulan    integer generated always as (extract(month from tanggal_realisasi)::int) stored,
  triwulan integer generated always as (ceil(extract(month from tanggal_realisasi)::numeric / 3)::int) stored,
  semester integer generated always as (
             case when extract(month from tanggal_realisasi) <= 6 then 1 else 2 end
           ) stored,
  nilai_realisasi     numeric(18,2) not null check (nilai_realisasi >= 0),
  persentase          numeric(5,2),  -- dihitung di layer aplikasi terhadap nilai_kontrak/pagu saat insert
  keterangan          text,
  created_by          uuid,   -- FK added in 006
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger trg_updated_at_paket_pengadaan before update on paket_pengadaan
  for each row execute function sipanda_set_updated_at();
create trigger trg_updated_at_kontrak before update on kontrak
  for each row execute function sipanda_set_updated_at();
create trigger trg_updated_at_realisasi before update on realisasi
  for each row execute function sipanda_set_updated_at();

create trigger trg_audit_paket_pengadaan
  after insert or update or delete on paket_pengadaan
  for each row execute function sipanda_audit_trigger();
create trigger trg_audit_kontrak
  after insert or update or delete on kontrak
  for each row execute function sipanda_audit_trigger();
create trigger trg_audit_realisasi
  after insert or update or delete on realisasi
  for each row execute function sipanda_audit_trigger();
