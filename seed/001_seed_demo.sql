-- =========================================================
-- SIPANDA — SEED DATA DEMO (⚠ BUKAN DATA RESMI ⚠)
-- Ditandai jelas sesuai aturan AS.2: "Tandai seed/demo data sebagai DATA DEMO"
-- Jangan jalankan skrip ini di lingkungan production.
-- =========================================================

insert into tahun_anggaran (tahun, status_aktif) values (2026, true);

insert into tahapan_anggaran (tahun_anggaran_id, nama, urutan, status_aktif)
select id, 'MURNI', 1, true from tahun_anggaran where tahun = 2026;

insert into program (tahun_anggaran_id, tahapan_anggaran_id, kode, nama, urusan, bidang_urusan)
select ta.id, th.id, 'PRG-DEMO-01', '[DATA DEMO] Program Peningkatan Pelayanan Publik',
       '[DATA DEMO] Urusan Wajib', '[DATA DEMO] Bidang Perekonomian'
from tahun_anggaran ta join tahapan_anggaran th on th.tahun_anggaran_id = ta.id
where ta.tahun = 2026 and th.nama = 'MURNI';

insert into kegiatan (program_id, kode, nama)
select id, 'KEG-DEMO-01', '[DATA DEMO] Kegiatan Pengadaan Sarana Prasarana'
from program where kode = 'PRG-DEMO-01';

insert into sub_kegiatan (kegiatan_id, kode, nama)
select id, 'SUBKEG-DEMO-01', '[DATA DEMO] Sub Kegiatan Pengadaan Peralatan Kantor'
from kegiatan where kode = 'KEG-DEMO-01';

insert into belanja (sub_kegiatan_id, kode_rekening, uraian_belanja)
select id, '5.2.02.DEMO', '[DATA DEMO] Belanja Peralatan dan Mesin'
from sub_kegiatan where kode = 'SUBKEG-DEMO-01';

insert into sumber_dana (nama, keterangan) values ('[DATA DEMO] APBD', 'Sumber dana demo');

insert into dpa (tahun_anggaran_id, tahapan_anggaran_id, sub_kegiatan_id, belanja_id,
                  uraian_belanja, pagu_anggaran, sumber_dana_id, status)
select ta.id, th.id, sk.id, b.id,
       '[DATA DEMO] Pengadaan Peralatan Kantor', 150000000, sd.id, 'AKTIF'
from tahun_anggaran ta
join tahapan_anggaran th on th.tahun_anggaran_id = ta.id and th.nama = 'MURNI'
join sub_kegiatan sk on sk.kode = 'SUBKEG-DEMO-01'
join belanja b on b.sub_kegiatan_id = sk.id
join sumber_dana sd on sd.nama = '[DATA DEMO] APBD'
where ta.tahun = 2026;

insert into penyedia (nama_penyedia, nib, npwp, alamat, jenis_usaha)
values ('[DATA DEMO] CV Sumber Makmur', '0000000000000', '00.000.000.0-000.000',
        '[DATA DEMO] Jl. Contoh No. 1', 'Perusahaan Perorangan');

insert into rup (tahun_anggaran_id, tahapan_anggaran_id, kode_rup, dpa_id, nama_paket,
                  jenis_rup, jenis_pengadaan_id, metode_pengadaan_id, pagu_paket,
                  sumber_dana_id, status_rup)
select ta.id, th.id, 'RUP-DEMO-2026-001', d.id,
       '[DATA DEMO] Pengadaan ATK dan Peralatan Kantor',
       'PENYEDIA', jp.id, mp.id, 150000000, sd.id, 'AKTIF'
from tahun_anggaran ta
join tahapan_anggaran th on th.tahun_anggaran_id = ta.id and th.nama = 'MURNI'
join dpa d on d.uraian_belanja = '[DATA DEMO] Pengadaan Peralatan Kantor'
join jenis_pengadaan jp on jp.kode = 'BARANG'
join metode_pengadaan mp on mp.kode = 'EPURCHASING'
join sumber_dana sd on sd.nama = '[DATA DEMO] APBD'
where ta.tahun = 2026;

insert into paket_pengadaan (rup_id, status_paket_id, persentase_realisasi_fisik)
select r.id, sp.id, 100
from rup r join status_paket sp on sp.kode = 'PEMBAYARAN'
where r.kode_rup = 'RUP-DEMO-2026-001';

insert into kontrak (paket_pengadaan_id, penyedia_id, nomor_kontrak, tanggal_kontrak, nilai_kontrak,
                      tanggal_mulai, tanggal_selesai)
select pp.id, p.id, '[DATA DEMO] 027/KTR-DEMO/2026', '2026-03-10', 148000000, '2026-03-11', '2026-04-10'
from paket_pengadaan pp
join rup r on r.id = pp.rup_id
join penyedia p on p.nama_penyedia = '[DATA DEMO] CV Sumber Makmur'
where r.kode_rup = 'RUP-DEMO-2026-001';

insert into realisasi (paket_pengadaan_id, tanggal_realisasi, nilai_realisasi, persentase, keterangan)
select pp.id, '2026-04-05', 148000000, 100, '[DATA DEMO] Realisasi pembayaran penuh'
from paket_pengadaan pp
join rup r on r.id = pp.rup_id
where r.kode_rup = 'RUP-DEMO-2026-001';

-- Catatan: 1 user demo (password harus di-hash oleh aplikasi, BUKAN di SQL ini).
-- Contoh pembuatan user sebaiknya dilakukan lewat endpoint/skrip aplikasi yang
-- memanggil fungsi hashing (argon2id), bukan lewat insert SQL manual dengan
-- password plaintext.
