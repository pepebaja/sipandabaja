// app/api/rup/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requirePermission, authErrorResponse } from "@/lib/auth/rbac";
import { supabaseAdmin } from "@/lib/db/supabase-admin";
import { withAuditContext } from "@/lib/db/pg";
import { rupUpdateSchema } from "@/lib/validation/rup";
import { checkPaguRupTerhadapDpa } from "@/lib/rup/pagu-check";

function getClientIp(req: NextRequest): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded ? forwarded.split(",")[0].trim() : null;
}

function serverErrorResponse(err: unknown) {
  const authRes = authErrorResponse(err);
  if (authRes) return authRes;
  console.error("[rup/id]", err);
  return NextResponse.json({ message: "Terjadi kendala saat memproses data. Silakan coba kembali." }, { status: 500 });
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await ctx.params;
    const { data, error } = await supabaseAdmin
      .from("rup")
      .select(
        `*, dpa:dpa_id ( uraian_belanja, pagu_anggaran ),
         jenis_pengadaan:jenis_pengadaan_id ( nama ),
         metode_pengadaan:metode_pengadaan_id ( nama, kategori_metode ),
         sumber_dana:sumber_dana_id ( nama ),
         paket_pengadaan ( id, status_paket_id, status_paket:status_paket_id ( kode, nama ) )`
      )
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ message: "Data RUP tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ data });
  } catch (err) {
    return serverErrorResponse(err);
  }
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const ip = getClientIp(req);
  try {
    const session = await requirePermission("rup.edit");
    const { id } = await ctx.params;

    const body = await req.json();
    const parsed = rupUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Data tidak valid. Periksa kolom yang ditandai.", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const entries = Object.entries(parsed.data).filter(([, v]) => v !== undefined);
    if (entries.length === 0) {
      return NextResponse.json({ message: "Tidak ada perubahan yang dikirim." }, { status: 400 });
    }

    const { data: before, error: beforeErr } = await supabaseAdmin.from("rup").select("*").eq("id", id).maybeSingle();
    if (beforeErr) throw beforeErr;
    if (!before) return NextResponse.json({ message: "Data RUP tidak ditemukan." }, { status: 404 });

    // Jika pagu_paket berubah, validasi ulang terhadap sisa pagu DPA (aturan
    // yang sama dengan saat create, sekarang mengecualikan baris RUP ini
    // sendiri dari total yang sudah terpakai).
    if (parsed.data.pagu_paket !== undefined && parsed.data.pagu_paket !== before.pagu_paket) {
      const paguCheck = await checkPaguRupTerhadapDpa({
        dpaId: before.dpa_id,
        paguPaketBaru: parsed.data.pagu_paket,
        excludeRupId: id,
      });
      if (paguCheck.diblokir) {
        return NextResponse.json({ message: paguCheck.pesan, paguCheck }, { status: 400 });
      }
    }

    const setClause = entries.map(([col], i) => `${col} = $${i + 1}`).join(", ");
    const values = entries.map(([, v]) => v);
    const updateSql = `update rup set ${setClause} where id = $${entries.length + 1} returning *`;

    const [row] = await withAuditContext(session.sub, ip, async (tx) => {
      const updated = await tx.unsafe(updateSql, [...values, id] as never[]);

      // Catat setiap field yang benar-benar berubah ke rup_revision (Section AA
      // — riwayat perubahan RUP), field-level, bukan snapshot baris baru
      // seperti DPA (lihat komentar di lib/validation/rup.ts).
      for (const [col, newVal] of entries) {
        const oldVal = (before as Record<string, unknown>)[col];
        if (String(oldVal ?? "") !== String(newVal ?? "")) {
          await tx`
            insert into rup_revision (rup_id, field_changed, nilai_sebelum, nilai_sesudah, user_id)
            values (${id}, ${col}, ${oldVal !== null && oldVal !== undefined ? String(oldVal) : null},
                    ${newVal !== null && newVal !== undefined ? String(newVal) : null}, ${session.sub})
          `;
        }
      }
      return updated;
    });

    if (!row) return NextResponse.json({ message: "Data RUP tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ message: "Data berhasil diperbarui.", data: row });
  } catch (err) {
    return serverErrorResponse(err);
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const ip = getClientIp(req);
  try {
    const session = await requirePermission("rup.delete");
    const { id } = await ctx.params;

    const [row] = await withAuditContext(session.sub, ip, (tx) =>
      tx`update rup set status_rup = 'DIARSIPKAN', status_aktif = false where id = ${id} returning id`
    );
    if (!row) return NextResponse.json({ message: "Data RUP tidak ditemukan." }, { status: 404 });

    return NextResponse.json({ message: "Data RUP berhasil diarsipkan." });
  } catch (err) {
    return serverErrorResponse(err);
  }
}
