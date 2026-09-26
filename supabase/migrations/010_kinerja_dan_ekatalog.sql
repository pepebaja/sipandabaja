-- =========================================================
-- SIPANDA — 010 Metode Pemilihan (E-Katalog/Non E-Katalog)
--              & Penilaian Kinerja PPBJ
-- =========================================================
-- Perubahan bersifat ADDITIVE — tidak mengubah struktur/data yang
-- sudah ada di migrasi 001–009.

-- ---------------------------------------------------------
-- 10.1 Klasifikasi E-Katalog / Non E-Katalog
-- ---------------------------------------------------------
-- Diletakkan sebagai atribut pada master metode_pengadaan (bukan per
-- transaksi paket) agar konsisten: setiap metode cukup diklasifikasi
-- sekali, seluruh paket yang memakai metode tsb otomatis terklasifikasi
-- lewat rup.metode_pengadaan_id. Admin dapat menambah metode baru dan
-- langsung menentukan kategorinya dari Master Data.
alter table metode_pengadaan
  add column kategori_metode text
    check (kategori_metode in ('E_KATALOG','NON_EKATALOG'));

update metode_pengadaan set kategori_metode = 'E_KATALOG'    where kode = 'EPURCHASING';
update metode_pengadaan set kategori_metode = 'NON_EKATALOG' where kode <> 'EPURCHASING';

alter table metode_pengadaan
  alter column kategori_metode set not null;

create index ix_metode_pengadaan_kategori on metode_pengadaan (kategori_metode);

-- ---------------------------------------------------------
-- 10.2 View rekap Metode Pemilihan Penyedia (E-Katalog vs Non E-Katalog)
-- ---------------------------------------------------------
-- Dihitung dinamis dari data aktual (tidak hard-code), difilter di
-- layer aplikasi berdasarkan tahun/tahapan/PPBJ yang dipilih.
create view v_rekap_metode_pemilihan
  with (security_invoker = true) as
select
  r.tahun_anggaran_id,
  r.tahapan_anggaran_id,
  r.created_by                     as ppbj_user_id,
  mp.kategori_metode,
  count(distinct r.id)             as jumlah_paket,
  sum(r.pagu_paket)                as total_pagu_paket,
  count(distinct k.id)             as jumlah_paket_terkontrak,
  coalesce(sum(k.nilai_kontrak),0) as total_nilai_kontrak
from rup r
join metode_pengadaan mp   on mp.id = r.metode_pengadaan_id
join paket_pengadaan pp    on pp.rup_id = r.id
left join kontrak k        on k.paket_pengadaan_id = pp.id
where r.status_aktif
group by r.tahun_anggaran_id, r.tahapan_anggaran_id, r.created_by, mp.kategori_metode;

-- ---------------------------------------------------------
-- 10.3 View rekap RUP (Penyedia/Swakelola) vs Realisasi — dasar
--       perhitungan penilaian kinerja
-- ---------------------------------------------------------
create view v_rekap_rup_vs_realisasi
  with (security_invoker = true) as
select
  r.tahun_anggaran_id,
  r.tahapan_anggaran_id,
  r.created_by                                  as ppbj_user_id,
  r.jenis_rup,
  count(distinct r.id)                          as jumlah_paket_rup,
  sum(r.pagu_paket)                             as total_pagu_rup,
  count(distinct pp.id) filter (
    where exists (select 1 from realisasi rl where rl.paket_pengadaan_id = pp.id)
  )                                              as jumlah_paket_terealisasi,
  coalesce(sum(rl_agg.total_realisasi), 0)      as total_nilai_realisasi
from rup r
join paket_pengadaan pp on pp.rup_id = r.id
left join lateral (
  select sum(rl.nilai_realisasi) as total_realisasi
  from realisasi rl
  where rl.paket_pengadaan_id = pp.id
) rl_agg on true
where r.status_aktif
group by r.tahun_anggaran_id, r.tahapan_anggaran_id, r.created_by, r.jenis_rup;

-- ---------------------------------------------------------
-- 10.4 Konfigurasi bobot penilaian kinerja (configurable, bukan hard-code)
-- ---------------------------------------------------------
create table konfigurasi_penilaian_kinerja (
  id                      uuid primary key default gen_random_uuid(),
  bobot_realisasi_jumlah_paket numeric(5,2) not null default 40
    check (bobot_realisasi_jumlah_paket between 0 and 100),
  bobot_realisasi_nominal       numeric(5,2) not null default 40
    check (bobot_realisasi_nominal between 0 and 100),
  bobot_ketepatan_metode        numeric(5,2) not null default 20
    check (bobot_ketepatan_metode between 0 and 100),
  keterangan              text,
  updated_at              timestamptz not null default now(),
  constraint ck_total_bobot_100 check (
    bobot_realisasi_jumlah_paket + bobot_realisasi_nominal + bobot_ketepatan_metode = 100
  )
);

insert into konfigurasi_penilaian_kinerja default values;

create trigger trg_updated_at_konfigurasi_kinerja before update on konfigurasi_penilaian_kinerja
  for each row execute function sipanda_set_updated_at();

-- ---------------------------------------------------------
-- 10.5 Penilaian Kinerja PPBJ — hasil generate (snapshot untuk
--       diunduh/riwayat), narasi & angka dihitung dari view di atas
--       PADA SAAT generate, bukan diketik manual.
-- ---------------------------------------------------------
create table penilaian_kinerja_ppbj (
  id                    uuid primary key default gen_random_uuid(),
  ppbj_user_id          uuid not null references users(id) on delete restrict,
  tahun_anggaran_id     uuid not null references tahun_anggaran(id) on delete restrict,
  tahapan_anggaran_id   uuid not null references tahapan_anggaran(id) on delete restrict,
  periode_jenis         text not null
                          check (periode_jenis in ('BULANAN','TRIWULANAN','SEMESTERAN','TAHUNAN')),
  periode_label         text not null,       -- mis. 'Triwulan II 2026'

  -- Snapshot metrik (diisi otomatis dari v_rekap_rup_vs_realisasi & v_rekap_metode_pemilihan)
  jumlah_paket_rup_penyedia     integer not null default 0,
  jumlah_paket_rup_swakelola    integer not null default 0,
  jumlah_paket_realisasi_penyedia  integer not null default 0,
  jumlah_paket_realisasi_swakelola integer not null default 0,
  nominal_rup_penyedia          numeric(18,2) not null default 0,
  nominal_rup_swakelola         numeric(18,2) not null default 0,
  nominal_realisasi_penyedia    numeric(18,2) not null default 0,
  nominal_realisasi_swakelola   numeric(18,2) not null default 0,
  jumlah_paket_ekatalog         integer not null default 0,
  jumlah_paket_non_ekatalog     integer not null default 0,
  nominal_ekatalog              numeric(18,2) not null default 0,
  nominal_non_ekatalog          numeric(18,2) not null default 0,

  skor_kinerja          numeric(5,2),         -- 0–100, dihitung app layer memakai bobot di atas
  narasi                text not null,        -- narasi deskriptif otomatis (bukan statis)

  format_export         text check (format_export in ('PDF','PPTX')),
  file_url              text,                 -- lokasi file hasil export (Supabase Storage)

  generated_by          uuid not null references users(id) on delete restrict,
  created_at             timestamptz not null default now(),

  unique (ppbj_user_id, tahun_anggaran_id, tahapan_anggaran_id, periode_jenis, periode_label)
);

create index ix_penilaian_kinerja_ppbj     on penilaian_kinerja_ppbj (ppbj_user_id);
create index ix_penilaian_kinerja_periode  on penilaian_kinerja_ppbj (tahun_anggaran_id, tahapan_anggaran_id, periode_jenis);

create trigger trg_audit_penilaian_kinerja
  after insert or update or delete on penilaian_kinerja_ppbj
  for each row execute function sipanda_audit_trigger();

alter table konfigurasi_penilaian_kinerja enable row level security;
alter table penilaian_kinerja_ppbj        enable row level security;
-- (tanpa policy anon/authenticated — lihat catatan model keamanan di 008)

-- Tambahkan permission modul baru
insert into permissions (kode) values ('kinerja.view'), ('kinerja.generate')
  on conflict (kode) do nothing;
