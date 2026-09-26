-- =========================================================
-- SIPANDA — 009 Seed Master Data (data operasional, BUKAN data demo)
-- =========================================================

-- Roles
insert into roles (nama) values ('ADMIN'), ('PPBJ'), ('VIEWER');

-- Permissions (kode granular per modul+aksi; daftar awal, dapat ditambah)
insert into permissions (kode) values
  ('dpa.view'),('dpa.create'),('dpa.edit'),('dpa.delete'),('dpa.import'),
  ('rup.view'),('rup.create'),('rup.edit'),('rup.delete'),('rup.import'),
  ('paket.view'),('paket.create'),('paket.edit'),('paket.delete'),
  ('kontrak.view'),('kontrak.create'),('kontrak.edit'),('kontrak.delete'),
  ('realisasi.view'),('realisasi.create'),('realisasi.edit'),('realisasi.delete'),
  ('penyedia.view'),('penyedia.create'),('penyedia.edit'),('penyedia.delete'),
  ('dashboard.view'),
  ('laporan.view'),('laporan.export'),
  ('kinerja.view'),('kinerja.generate'),
  ('master.manage'),
  ('user.manage'),
  ('audit.view'),
  ('backup.export');

-- ADMIN → seluruh permission
insert into role_permissions (role_id, permission_id)
select r.id, p.id from roles r cross join permissions p where r.nama = 'ADMIN';

-- PPBJ → semua kecuali user.manage, master.manage, audit.view, backup.export
insert into role_permissions (role_id, permission_id)
select r.id, p.id from roles r cross join permissions p
where r.nama = 'PPBJ'
  and p.kode not in ('user.manage','master.manage','audit.view','backup.export');

-- VIEWER → hanya view + export laporan
insert into role_permissions (role_id, permission_id)
select r.id, p.id from roles r cross join permissions p
where r.nama = 'VIEWER'
  and p.kode in ('dashboard.view','laporan.view','laporan.export','kinerja.view');

-- Status Paket (urutan alur pelaksanaan; nama/urutan dapat diedit di Master Data)
insert into status_paket (kode, nama, urutan, is_final) values
  ('RUP',                  'RUP',                    1, false),
  ('PERSIAPAN',            'Persiapan',              2, false),
  ('PROSES_PENGADAAN',     'Proses Pengadaan',       3, false),
  ('PEMILIHAN',            'Pemilihan',              4, false),
  ('KONTRAK',              'Kontrak',                5, false),
  ('PELAKSANAAN',          'Pelaksanaan',            6, false),
  ('SELESAI',              'Selesai',                7, false),
  ('BAST',                 'BAST',                   8, false),
  ('PEMBAYARAN',           'Pembayaran',             9, false),
  ('SELESAI_ADMINISTRASI', 'Selesai Administrasi',  10, true),
  ('DIBATALKAN',           'Dibatalkan',             11, true);

-- Jenis Pengadaan
insert into jenis_pengadaan (kode, nama, urutan) values
  ('BARANG',            'Barang',                     1),
  ('PEKERJAAN_KONSTRUKSI','Pekerjaan Konstruksi',      2),
  ('JASA_KONSULTANSI',  'Jasa Konsultansi',            3),
  ('JASA_LAINNYA',      'Jasa Lainnya',                4);

-- Metode Pengadaan — lihat migrasi 010 untuk kolom kategori_metode
-- (E-Katalog / Non E-Katalog) yang ditambahkan secara additive.
insert into metode_pengadaan (kode, nama, urutan) values
  ('EPURCHASING',        'E-Purchasing (E-Katalog)',        1),
  ('PENGADAAN_LANGSUNG', 'Pengadaan Langsung',              2),
  ('PENUNJUKAN_LANGSUNG','Penunjukan Langsung',             3),
  ('TENDER_CEPAT',       'Tender Cepat',                    4),
  ('TENDER',             'Tender',                          5),
  ('SELEKSI',            'Seleksi',                         6),
  ('SWAKELOLA',          'Swakelola',                       7);
