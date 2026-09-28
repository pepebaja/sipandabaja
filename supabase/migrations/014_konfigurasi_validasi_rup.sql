-- =========================================================
-- SIPANDA — 014 Konfigurasi Validasi Pagu RUP vs DPA
-- =========================================================
-- Business rule AC.10 & catatan Section E/I: validasi total pagu paket RUP
-- terhadap pagu DPA terkait sebaiknya BISA dikonfigurasi, bukan aturan kaku
-- yang selalu memblokir (ada kondisi administratif khusus di lapangan).
-- Additive, tidak mengubah tabel yang sudah ada.

create table konfigurasi_validasi_rup (
  id                            uuid primary key default gen_random_uuid(),
  blokir_pagu_rup_melebihi_dpa  boolean not null default true,
  toleransi_persen              numeric(5,2) not null default 0
    check (toleransi_persen between 0 and 100), -- mis. 5 artinya boleh melebihi hingga 5%
  keterangan                    text,
  updated_at                    timestamptz not null default now()
);

insert into konfigurasi_validasi_rup default values;

create trigger trg_updated_at_konfigurasi_validasi_rup before update on konfigurasi_validasi_rup
  for each row execute function sipanda_set_updated_at();

alter table konfigurasi_validasi_rup enable row level security;
-- tanpa policy anon/authenticated — sama seperti tabel lain (lihat 008)
