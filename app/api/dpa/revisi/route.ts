// app/api/dpa/revisi/route.ts
//
// Inti fitur versioning DPA (STEP I dokumen spesifikasi): dipanggil saat
// tahap PERGESERAN/PERUBAHAN mengubah pagu, menambah sub kegiatan/belanja
// baru, atau memindahkan sumber dana. TIDAK PERNAH meng-UPDATE baris dpa
// milik tahapan yang sudah lewat — selalu:
//   1. Buat baris `dpa` BARU untuk tahapan_tujuan (atau pakai yang sudah ada
//      bila kombinasi tahun+tahapan+belanja itu sudah pernah dibuat lewat
//      revisi sebelumnya — idempotent terhadap percobaan ulang).
//   2. Catat `dpa_revision` yang menautkan baris lama → baris baru dengan
//      pagu_sebelum/pagu_sesudah (selisih dihitung otomatis oleh generated
//      column di database, bukan di sini).
// Kedua langkah dibungkus SATU transaksi (withAuditContext) agar atomik.

import { NextRequest, NextResponse } from "next/server";
import { requirePermission, authErrorResponse } from "@/lib/auth/rbac";
import { supabaseAdmin } from "@/lib/db/supabase-admin";
import { withAuditContext } from "@/lib/db/pg";
import { dpaRevisiSchema } from "@/lib/validation/dpa";

function getClientIp(req: NextRequest): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded ? forwarded.split(",")[0].trim() : null;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  try {
    const session = await requirePermission("dpa.edit"); // revisi dianggap bagian dari izin edit DPA

    const body = await req.json();
    const parsed = dpaRevisiSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Data tidak valid. Periksa kolom yang ditandai.", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const d = parsed.data;

    // 1) Tentukan pagu_sebelum & tahapan_asal dari baris sumber (jika ada)
    let paguSebelum = 0;
    let tahapanAsalNama: string | null = null;
    if (d.dpa_asal_id) {
      const { data: dpaAsal, error } = await supabaseAdmin
        .from("dpa")
        .select("pagu_anggaran, tahapan_anggaran:tahapan_anggaran_id ( nama )")
        .eq("id", d.dpa_asal_id)
        .maybeSingle();
      if (error) throw error;
      if (!dpaAsal) {
        return NextResponse.json({ message: "Data DPA asal tidak ditemukan." }, { status: 404 });
      }
      paguSebelum = Number(dpaAsal.pagu_anggaran);
      tahapanAsalNama = (dpaAsal as any).tahapan_anggaran?.nama ?? null;
    }

    const { data: tahapanTujuan, error: tahapanErr } = await supabaseAdmin
      .from("tahapan_anggaran")
      .select("nama")
      .eq("id", d.tahapan_tujuan_id)
      .maybeSingle();
    if (tahapanErr) throw tahapanErr;
    if (!tahapanTujuan) {
      return NextResponse.json({ message: "Tahapan tujuan tidak ditemukan." }, { status: 404 });
    }

    const result = await withAuditContext(session.sub, ip, async (tx) => {
      // 2) Cari/insert baris dpa untuk tahapan_tujuan (unique: tahun+tahapan+belanja)
      const existing = await tx`
        select * from dpa
        where tahun_anggaran_id = ${d.tahun_anggaran_id}
          and tahapan_anggaran_id = ${d.tahapan_tujuan_id}
          and belanja_id = ${d.belanja_id}
      `;

      let dpaTujuan;
      if (existing.length > 0) {
        // Sudah ada baris untuk tahapan tujuan ini (mis. revisi kedua dalam
        // tahapan yang sama) — perbarui pagu-nya, TETAP catat sebagai revisi baru.
        [dpaTujuan] = await tx`
          update dpa set pagu_anggaran = ${d.pagu_baru}, uraian_belanja = ${d.uraian_belanja},
                 sumber_dana_id = ${d.sumber_dana_id ?? null}
          where id = ${existing[0].id}
          returning *
        `;
      } else {
        [dpaTujuan] = await tx`
          insert into dpa (
            tahun_anggaran_id, tahapan_anggaran_id, sub_kegiatan_id, belanja_id,
            uraian_belanja, pagu_anggaran, sumber_dana_id, status, created_by
          ) values (
            ${d.tahun_anggaran_id}, ${d.tahapan_tujuan_id}, ${d.sub_kegiatan_id}, ${d.belanja_id},
            ${d.uraian_belanja}, ${d.pagu_baru}, ${d.sumber_dana_id ?? null}, 'AKTIF', ${session.sub}
          )
          returning *
        `;
      }

      const [revision] = await tx`
        insert into dpa_revision (
          dpa_id, dpa_asal_id, tahapan_asal, tahapan_tujuan,
          pagu_sebelum, pagu_sesudah, jenis_perubahan, user_id, catatan
        ) values (
          ${dpaTujuan.id}, ${d.dpa_asal_id ?? null}, ${tahapanAsalNama}, ${tahapanTujuan.nama},
          ${paguSebelum}, ${d.pagu_baru}, ${d.jenis_perubahan}, ${session.sub}, ${d.catatan ?? null}
        )
        returning *
      `;

      return { dpaTujuan, revision };
    });

    return NextResponse.json(
      {
        message: `Revisi berhasil disimpan. Pagu ${tahapanTujuan.nama}: Rp${d.pagu_baru.toLocaleString("id-ID")}.`,
        data: result,
      },
      { status: 201 }
    );
  } catch (err) {
    const authRes = authErrorResponse(err);
    if (authRes) return authRes;
    console.error("[dpa/revisi]", err);
    return NextResponse.json(
      { message: "Terjadi kendala saat menyimpan revisi. Silakan coba kembali." },
      { status: 500 }
    );
  }
}
