// app/api/rup/import/commit/route.ts
//
// Preview memvalidasi pagu PER BARIS terhadap kondisi database saat itu.
// Namun beberapa baris dalam satu file bisa merujuk DPA yang sama, dan
// jumlah kumulatifnya bisa melebihi pagu walau tiap baris lolos sendiri-
// sendiri. Karena itu commit menghitung ulang total per dpa_id sebelum
// menulis apa pun, dan memeriksa duplikat kode_rup di dalam file itu sendiri.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission, authErrorResponse } from "@/lib/auth/rbac";
import { supabaseAdmin } from "@/lib/db/supabase-admin";
import { withAuditContext } from "@/lib/db/pg";
import { logAuditEvent } from "@/lib/audit/logger";
import { checkPaguRupTerhadapDpa } from "@/lib/rup/pagu-check";

const uuidNullable = z.string().uuid().nullable();

const rowSchema = z.object({
  tahun_anggaran_id: z.string().uuid(),
  tahapan_anggaran_id: z.string().uuid(),
  dpa_id: z.string().uuid(),
  kode_rup: z.string().min(1),
  nama_paket: z.string().min(1),
  jenis_rup: z.enum(["PENYEDIA", "SWAKELOLA"]),
  jenis_pengadaan_id: uuidNullable,
  metode_pengadaan_id: uuidNullable,
  pagu_paket: z.number().nonnegative(),
  sumber_dana_id: uuidNullable,
  lokasi: z.string().nullable(),
  volume: z.number().nullable(),
  satuan: z.string().nullable(),
  jadwal_pemilihan: z.string().nullable(),
  jadwal_mulai: z.string().nullable(),
  jadwal_selesai: z.string().nullable(),
  spesifikasi: z.string().nullable(),
});

const commitSchema = z.object({ rows: z.array(rowSchema).min(1).max(1000) });

function getClientIp(req: NextRequest): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded ? forwarded.split(",")[0].trim() : null;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  try {
    const session = await requirePermission("rup.import");

    const parsed = commitSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ message: "Data import tidak valid." }, { status: 400 });
    }
    const { rows } = parsed.data;

    // 1) Duplikat kode_rup di dalam file
    const seen = new Set<string>();
    for (const r of rows) {
      const key = `${r.tahun_anggaran_id}|${r.tahapan_anggaran_id}|${r.kode_rup}`;
      if (seen.has(key)) {
        return NextResponse.json(
          { message: `Kode RUP '${r.kode_rup}' muncul lebih dari sekali di file import.` },
          { status: 400 }
        );
      }
      seen.add(key);
    }

    // 2) Pagu kumulatif per DPA
    const totalPerDpa = new Map<string, number>();
    for (const r of rows) totalPerDpa.set(r.dpa_id, (totalPerDpa.get(r.dpa_id) ?? 0) + r.pagu_paket);
    for (const [dpaId, total] of totalPerDpa) {
      const check = await checkPaguRupTerhadapDpa({ dpaId, paguPaketBaru: total });
      if (check.diblokir) {
        return NextResponse.json(
          { message: `Import dibatalkan, tidak ada data yang tersimpan. ${check.pesan}` },
          { status: 400 }
        );
      }
    }

    const { data: statusAwal } = await supabaseAdmin.from("status_paket").select("id").eq("kode", "RUP").maybeSingle();
    if (!statusAwal) {
      return NextResponse.json({ message: "Master Status Paket 'RUP' belum tersedia. Hubungi Admin." }, { status: 500 });
    }

    // 3) Insert atomik: rup + paket_pengadaan pendamping
    let inserted = 0;
    await withAuditContext(session.sub, ip, async (tx) => {
      for (const r of rows) {
        const [rup] = await tx`
          insert into rup (
            tahun_anggaran_id, tahapan_anggaran_id, kode_rup, dpa_id, nama_paket, jenis_rup,
            jenis_pengadaan_id, metode_pengadaan_id, pagu_paket, sumber_dana_id, lokasi, volume,
            satuan, jadwal_pemilihan, jadwal_mulai, jadwal_selesai, spesifikasi, status_rup, created_by
          ) values (
            ${r.tahun_anggaran_id}, ${r.tahapan_anggaran_id}, ${r.kode_rup}, ${r.dpa_id}, ${r.nama_paket}, ${r.jenis_rup},
            ${r.jenis_pengadaan_id}, ${r.metode_pengadaan_id}, ${r.pagu_paket}, ${r.sumber_dana_id}, ${r.lokasi}, ${r.volume},
            ${r.satuan}, ${r.jadwal_pemilihan || null}, ${r.jadwal_mulai || null}, ${r.jadwal_selesai || null},
            ${r.spesifikasi}, 'AKTIF', ${session.sub}
          )
          returning id
        `;
        await tx`insert into paket_pengadaan (rup_id, status_paket_id) values (${rup.id}, ${statusAwal.id})`;
        inserted++;
      }
    });

    await logAuditEvent({
      userId: session.sub,
      action: "IMPORT",
      module: "rup",
      ipAddress: ip,
      detail: { jumlah_baris: inserted },
    });

    return NextResponse.json({ message: `Import berhasil: ${inserted} data masuk.`, inserted });
  } catch (err) {
    const authRes = authErrorResponse(err);
    if (authRes) return authRes;
    console.error("[rup/import/commit]", err);
    return NextResponse.json(
      { message: "Terjadi kendala saat menyimpan data import. Tidak ada data yang tersimpan sebagian." },
      { status: 500 }
    );
  }
}
