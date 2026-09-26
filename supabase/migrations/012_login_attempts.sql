-- =========================================================
-- SIPANDA — 012 Login Attempts (brute-force protection per-IP)
-- =========================================================
-- Tabel ini terpisah dari users.failed_login_count/locked_until:
-- - users.failed_login_count/locked_until → mengunci PER AKUN
-- - login_attempts                        → mendeteksi/mengunci PER IP
-- Keduanya dipakai bersamaan agar serangan credential-stuffing dari
-- satu IP ke banyak username tetap tertangkap, dan serangan ke satu
-- akun dari banyak IP tetap terkunci di level akun.

create table login_attempts (
  id          uuid primary key default gen_random_uuid(),
  username    text not null,
  ip_address  text,
  success     boolean not null,
  created_at  timestamptz not null default now()
);

create index ix_login_attempts_ip        on login_attempts (ip_address, created_at);
create index ix_login_attempts_username  on login_attempts (username, created_at);

alter table login_attempts enable row level security;
-- tanpa policy anon/authenticated — hanya diakses backend lewat service_role,
-- sama seperti model keamanan tabel lain (lihat 008_row_level_security.sql)
