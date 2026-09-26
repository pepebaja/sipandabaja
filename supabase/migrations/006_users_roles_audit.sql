-- =========================================================
-- SIPANDA — 006 Users, Roles, Permissions, Audit Log
-- =========================================================

create table users (
  id             uuid primary key default gen_random_uuid(),
  username       text not null unique,
  password_hash  text not null,     -- argon2id/bcrypt hash, NEVER plaintext
  nama_lengkap   text not null,
  status_aktif   boolean not null default true,
  last_login_at  timestamptz,
  failed_login_count smallint not null default 0,
  locked_until   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table roles (
  id   uuid primary key default gen_random_uuid(),
  nama text not null unique check (nama in ('ADMIN','PPBJ','VIEWER'))
);

create table permissions (
  id   uuid primary key default gen_random_uuid(),
  kode text not null unique     -- e.g. 'dpa.create', 'dpa.edit', 'rup.delete', 'laporan.export'
);

create table role_permissions (
  role_id       uuid not null references roles(id) on delete cascade,
  permission_id uuid not null references permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create table user_roles (
  user_id uuid not null references users(id) on delete cascade,
  role_id uuid not null references roles(id) on delete cascade,
  primary key (user_id, role_id)
);

create table audit_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references users(id) on delete set null,
  action     text not null check (action in
               ('CREATE','UPDATE','DELETE','IMPORT','EXPORT','LOGIN','LOGOUT')),
  module     text not null,        -- nama tabel/modul
  record_id  text,
  old_value  jsonb,
  new_value  jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);

create trigger trg_updated_at_users before update on users
  for each row execute function sipanda_set_updated_at();

-- ---------------------------------------------------------
-- Deferred foreign keys (tabel referensinya belum ada saat
-- dpa/dpa_revision/rup/rup_revision/paket_pengadaan/kontrak/
-- realisasi dibuat di migrasi 003–005)
-- ---------------------------------------------------------
alter table dpa              add constraint fk_dpa_created_by              foreign key (created_by) references users(id) on delete set null;
alter table dpa_revision     add constraint fk_dpa_revision_user           foreign key (user_id)    references users(id) on delete set null;
alter table rup              add constraint fk_rup_created_by              foreign key (created_by) references users(id) on delete set null;
alter table rup_revision     add constraint fk_rup_revision_user           foreign key (user_id)    references users(id) on delete set null;
alter table paket_pengadaan  add constraint fk_paket_pengadaan_created_by  foreign key (created_by) references users(id) on delete set null;
alter table kontrak          add constraint fk_kontrak_created_by          foreign key (created_by) references users(id) on delete set null;
alter table realisasi        add constraint fk_realisasi_created_by        foreign key (created_by) references users(id) on delete set null;
