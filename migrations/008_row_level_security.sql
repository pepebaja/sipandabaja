-- =========================================================
-- SIPANDA — 008 Row Level Security
-- =========================================================
-- Model keamanan SIPANDA: autentikasi username/password custom (bukan
-- Supabase Auth), sehingga sesi tidak membawa JWT Supabase dengan
-- auth.uid(). Otorisasi granular (RBAC per aksi+modul) ditegakkan di
-- server (Next.js API/Server Action) SEBELUM query dijalankan — lihat
-- STEP 8 dokumen arsitektur.
--
-- RLS di sini berfungsi sebagai lapisan kedua (defense-in-depth):
-- mengaktifkan RLS tanpa policy untuk role `anon`/`authenticated`
-- membuat tabel TIDAK BISA diakses sama sekali lewat Supabase client
-- (mis. jika key publik/anon key pernah bocor ke browser). Server
-- Next.js mengakses database memakai service_role key (disimpan hanya
-- di environment variable server) yang secara default melewati RLS.
--
-- Jika di kemudian hari SIPANDA beralih ke Supabase Auth murni, tambah
-- migrasi baru berisi policy granular berbasis auth.uid()/role klaim.

alter table tahun_anggaran     enable row level security;
alter table tahapan_anggaran   enable row level security;
alter table program            enable row level security;
alter table kegiatan           enable row level security;
alter table sub_kegiatan       enable row level security;
alter table belanja            enable row level security;
alter table sumber_dana        enable row level security;
alter table jenis_pengadaan    enable row level security;
alter table metode_pengadaan   enable row level security;
alter table status_paket       enable row level security;
alter table penyedia           enable row level security;
alter table profil_skpd        enable row level security;
alter table dpa                enable row level security;
alter table dpa_revision       enable row level security;
alter table rup                enable row level security;
alter table rup_revision       enable row level security;
alter table paket_pengadaan    enable row level security;
alter table kontrak            enable row level security;
alter table realisasi          enable row level security;
alter table users              enable row level security;
alter table roles              enable row level security;
alter table permissions        enable row level security;
alter table role_permissions   enable row level security;
alter table user_roles         enable row level security;
alter table audit_logs         enable row level security;

-- Tidak ada policy dibuat untuk anon/authenticated di sini secara
-- sengaja → default Postgres RLS adalah DENY ALL tanpa policy yang
-- cocok. service_role (dipakai backend Next.js) tetap dapat mengakses
-- penuh karena melewati RLS secara bawaan di Supabase.
