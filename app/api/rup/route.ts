// app/api/rup/route.ts
//
// POST di sini melakukan DUA hal penting dalam satu transaksi:
//  1. Validasi pagu_paket terhadap sisa pagu DPA terkait (lib/rup/pagu-check.ts),
//     mengikuti konfigurasi blokir/toleransi.
//  2. Setelah insert baris `rup`, otomatis membuat baris `paket_pengadaan`
//     pendamping dengan status awal 'RUP' (master status_paket) — sesuai
//     alur status paket di Section J: RUP → Persiapan → ... . Ini membuat
//     setiap RUP langsung "punya" paket_pengadaan sejak awal, sehingga
//     view rekap (v_rekap_rup_vs_realisasi, v_rekap_metode_pemilihan) dari
//     migrasi 010 langsung bisa menghitungnya begitu Phase 7 (Pelaksanaan)
//     mulai mengubah statusnya.

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requirePermission, authErrorResponse } from "@/lib/auth/rbac";
import { supabaseAdmin } from "@/lib/db/supabase-admin";
import { withAuditContext } from "@/lib/db/pg";
import { rupCreateSchema } from "@/lib/validation/rup";
import { checkPaguRupTerhadapDpa } from "@/lib/rup/pagu-check";

function getClientIp(req: NextRequest): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded ? forwarded.split(",")[0].trim() : null;
}

function serverErrorResponse(err: unknown) {
  const authRes = authErrorResponse(err);
  if (authRes) return authRes;
  console.error("[rup]", err);
  const message = err instanceof Error ? err.message : "";
  return NextResponse.json(
    { message: message.includes("tidak ditemukan") ? message : "Terjadi kendala saat memproses data. Silakan coba kembali." },
    { status: message.toLowerCase().includes("duplicate") ? 409 : message.includes("tidak ditemukan") ? 404 : 500 }
  );
}

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") ?? 20)));
    const q = url.searchParams.get("q")?.trim();
    const tahunId = url.searchParams.get("tahun_anggaran_id");
    const tahapanId = url.searchParams.get("tahapan_anggaran_id");
    const jenisRup = url.searchParams.get("jenis_rup");
    const statusRup = url.searchParams.get("status_rup");
    const dpaId = url.searchParams.get("dpa_id");
    const sortBy = url.searchParams.get("sortBy") ?? "created_at";
    const sortDir = url.searchParams.get("sortDir") === "asc";

    let query = supabaseAdmin
      .from("rup")
      .select(
        `*, dpa:dpa_id ( uraian_belanja ),
         jenis_pengadaan:jenis_pengadaan_id ( nama ),
         metode_pengadaan:metode_pengadaan_id ( nama, kategori_metode ),
         sumber_dana:sumber_dana_id ( nama ),
         paket_pengadaan ( id, status_paket:status_paket_id ( kode, nama ) )`,
        { count: "exact" }
      );

    if (tahunId) query = query.eq("tahun_anggaran_id", tahunId);
    if (tahapanId) query = query.eq("tahapan_anggaran_id", tahapanId);
    if (jenisRup) query = query.eq("jenis_rup", jenisRup);
    if (statusRup) query = query.eq("status_rup", statusRup);
    if (dpaId) query = query.eq("dpa_id", dpaId);
    if (q) query = query.or(`nama_paket.ilike.%${q}%,kode_rup.ilike.%${q}%`);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.order(sortBy, { ascending: sortDir }).range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;

    return NextResponse.json({
      data,
      pagination: { page, pageSize, total: count ?? 0, totalPages: Math.ceil((count ?? 0) / pageSize) },
    });
  } catch (err) {
    return serverErrorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  try {
    const session = await requirePermission("rup.create");

    const body = await req.json();
    const parsed = rupCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Data tidak valid. Periksa kolom yang ditandai.", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const d = parsed.data;

    const paguCheck = await checkPaguRupTerhadapDpa({ dpaId: d.dpa_id, paguPaketBaru: d.pagu_paket });
    if (paguCheck.diblokir) {
      return NextResponse.json({ message: paguCheck.pesan, paguCheck }, { status: 400 });
    }

    const { data: statusRupAwal } = await supabaseAdmin
      .from("status_paket")
      .select("id")
      .eq("kode", "RUP")
      .maybeSingle();
    if (!statusRupAwal) {
      return NextResponse.json(
        { message: "Master Status Paket 'RUP' belum tersedia. Hubungi Admin." },
        { status: 500 }
      );
    }

    const result = await withAuditContext(session.sub, ip, async (tx) => {
      const [rupRow] = await tx`
        insert into rup (
          tahun_anggaran_id, tahapan_anggaran_id, kode_rup, dpa_id, nama_paket, jenis_rup,
          jenis_pengadaan_id, metode_pengadaan_id, pagu_paket, sumber_dana_id, lokasi, volume,
          satuan, jadwal_pemilihan, jadwal_mulai, jadwal_selesai, spesifikasi, status_rup, created_by
        ) values (
          ${d.tahun_anggaran_id}, ${d.tahapan_anggaran_id}, ${d.kode_rup}, ${d.dpa_id}, ${d.nama_paket}, ${d.jenis_rup},
          ${d.jenis_pengadaan_id ?? null}, ${d.metode_pengadaan_id ?? null}, ${d.pagu_paket}, ${d.sumber_dana_id ?? null},
          ${d.lokasi ?? null}, ${d.volume ?? null}, ${d.satuan ?? null}, ${d.jadwal_pemilihan ?? null},
          ${d.jadwal_mulai ?? null}, ${d.jadwal_selesai ?? null}, ${d.spesifikasi ?? null},
          ${d.status_rup ?? "AKTIF"}, ${session.sub}
        )
        returning *
      `;

      const [paketRow] = await tx`
        insert into paket_pengadaan (rup_id, status_paket_id)
        values (${rupRow.id}, ${statusRupAwal.id})
        returning *
      `;

      return { rup: rupRow, paket_pengadaan: paketRow };
    });

    return NextResponse.json(
      {
        message: "Data RUP berhasil disimpan.",
        data: result,
        peringatanPagu: paguCheck.melebihi ? paguCheck.pesan : null,
      },
      { status: 201 }
    );
  } catch (err) {
    return serverErrorResponse(err);
  }
}
