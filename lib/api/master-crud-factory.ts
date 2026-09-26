// lib/api/master-crud-factory.ts
//
// Modul master data (Program, Kegiatan, Sub Kegiatan, Belanja, Sumber Dana,
// Jenis/Metode Pengadaan, Status Paket, Penyedia, Tahun/Tahapan Anggaran)
// punya bentuk CRUD yang sama persis: list+search+filter+pagination+sort,
// create, update, soft-delete — hanya beda nama tabel/kolom. Daripada
// menulis 11× logika yang identik (dan 11× celah bug yang sama), seluruh
// logika ditulis SEKALI di sini; tiap route di app/api/master-data/<entity>/
// hanya memanggil factory ini dengan konfigurasi masing-masing.
//
// CATATAN KEAMANAN: `table` dan nama kolom di `columns`/`searchableColumns`
// SELALU berasal dari konfigurasi tetap yang ditulis developer di kode
// (bukan dari input request), sehingga interpolasi string ke SQL di bawah
// ini AMAN dari SQL Injection — hanya NILAI (values) yang datang dari
// request, dan itu selalu dikirim lewat parameter terikat ($1, $2, ...),
// tidak pernah digabung sebagai string.

import { NextRequest, NextResponse } from "next/server";
import type { ZodTypeAny } from "zod";
import { requireAuth, requirePermission, authErrorResponse } from "@/lib/auth/rbac";
import { supabaseAdmin } from "@/lib/db/supabase-admin";
import { withAuditContext } from "@/lib/db/pg";

export interface MasterEntityConfig {
  table: string; // nama tabel fisik, mis. 'program'
  columns: string[]; // kolom yang boleh ditulis (sesuai urutan key di schema), TIDAK termasuk id/created_at/updated_at
  createSchema: ZodTypeAny;
  searchableColumns?: string[]; // kolom untuk pencarian bebas (?q=...), pakai ILIKE
  parentFilterColumn?: string; // mis. 'program_id' — dukung ?program_id=<uuid> untuk dependent dropdown
  defaultOrderBy?: string; // default 'nama'
  softDeleteColumn?: string; // default 'status_aktif'; null jika tabel tidak punya kolom ini (hard delete)
  permissionCode?: string; // default 'master.manage'
}

function getClientIp(req: NextRequest): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded ? forwarded.split(",")[0].trim() : null;
}

function errorResponse(err: unknown) {
  const authRes = authErrorResponse(err);
  if (authRes) return authRes;
  const message = err instanceof Error ? err.message : "Terjadi kendala pada server.";
  // Jangan pernah expose detail teknis (SQL error, stack trace) ke user (aturan AH).
  console.error("[master-data]", err);
  return NextResponse.json(
    { message: "Terjadi kendala saat memproses data. Silakan coba kembali." },
    { status: message.toLowerCase().includes("duplicate") ? 409 : 500 }
  );
}

/**
 * Handler untuk rute koleksi: GET (list, search, filter, sort, pagination)
 * dan POST (create).
 */
export function createCollectionHandlers(config: MasterEntityConfig) {
  const softDeleteCol = config.softDeleteColumn ?? "status_aktif";
  const permission = config.permissionCode ?? "master.manage";

  async function GET(req: NextRequest) {
    try {
      await requireAuth(); // semua role terautentikasi boleh MELIHAT master data (dibutuhkan untuk dependent dropdown)

      const url = new URL(req.url);
      const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
      const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") ?? 20)));
      const q = url.searchParams.get("q")?.trim();
      const statusFilter = url.searchParams.get("status_aktif"); // 'true' | 'false' | 'all' | null(=true)
      const sortBy = url.searchParams.get("sortBy") ?? config.defaultOrderBy ?? "nama";
      const sortDir = url.searchParams.get("sortDir") === "desc" ? true : false;

      let query = supabaseAdmin.from(config.table).select("*", { count: "exact" });

      if (config.parentFilterColumn) {
        const parentValue = url.searchParams.get(config.parentFilterColumn);
        if (parentValue) query = query.eq(config.parentFilterColumn, parentValue);
      }

      if (softDeleteCol && statusFilter !== "all") {
        query = query.eq(softDeleteCol, statusFilter === "false" ? false : true);
      }

      if (q && config.searchableColumns?.length) {
        const orExpr = config.searchableColumns.map((col) => `${col}.ilike.%${q}%`).join(",");
        query = query.or(orExpr);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.order(sortBy, { ascending: !sortDir }).range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;

      return NextResponse.json({
        data,
        pagination: { page, pageSize, total: count ?? 0, totalPages: Math.ceil((count ?? 0) / pageSize) },
      });
    } catch (err) {
      return errorResponse(err);
    }
  }

  async function POST(req: NextRequest) {
    const ip = getClientIp(req);
    try {
      const session = await requirePermission(permission);

      const body = await req.json();
      const parsed = config.createSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { message: "Data tidak valid. Periksa kolom yang ditandai.", errors: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const values = config.columns.map((col) => (parsed.data as Record<string, unknown>)[col] ?? null);
      const placeholders = config.columns.map((_, i) => `$${i + 1}`).join(", ");
      const insertSql = `insert into ${config.table} (${config.columns.join(", ")}) values (${placeholders}) returning *`;

      const [row] = await withAuditContext(session.sub, ip, (tx) => tx.unsafe(insertSql, values as never[]));

      return NextResponse.json({ message: "Data berhasil disimpan.", data: row }, { status: 201 });
    } catch (err) {
      return errorResponse(err);
    }
  }

  return { GET, POST };
}

/**
 * Handler untuk rute item: GET (detail), PUT (update parsial), DELETE
 * (soft delete bila softDeleteColumn tersedia, hard delete bila null).
 */
export function createItemHandlers(config: MasterEntityConfig) {
  const softDeleteCol = config.softDeleteColumn ?? "status_aktif";
  const permission = config.permissionCode ?? "master.manage";

  async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    try {
      await requireAuth();
      const { id } = await ctx.params;
      const { data, error } = await supabaseAdmin.from(config.table).select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data) return NextResponse.json({ message: "Data tidak ditemukan." }, { status: 404 });
      return NextResponse.json({ data });
    } catch (err) {
      return errorResponse(err);
    }
  }

  async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    const ip = getClientIp(req);
    try {
      const session = await requirePermission(permission);
      const { id } = await ctx.params;

      const body = await req.json();
      const parsed = config.createSchema.partial().safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { message: "Data tidak valid. Periksa kolom yang ditandai.", errors: parsed.error.flatten() },
          { status: 400 }
        );
      }
      const entries = Object.entries(parsed.data).filter(([k]) => config.columns.includes(k));
      if (entries.length === 0) {
        return NextResponse.json({ message: "Tidak ada perubahan yang dikirim." }, { status: 400 });
      }

      const setClause = entries.map(([col], i) => `${col} = $${i + 1}`).join(", ");
      const values = entries.map(([, v]) => v);
      const updateSql = `update ${config.table} set ${setClause} where id = $${entries.length + 1} returning *`;

      const [row] = await withAuditContext(session.sub, ip, (tx) =>
        tx.unsafe(updateSql, [...values, id] as never[])
      );

      if (!row) return NextResponse.json({ message: "Data tidak ditemukan." }, { status: 404 });
      return NextResponse.json({ message: "Data berhasil diperbarui.", data: row });
    } catch (err) {
      return errorResponse(err);
    }
  }

  async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    const ip = getClientIp(req);
    try {
      const session = await requirePermission(permission);
      const { id } = await ctx.params;

      if (softDeleteCol) {
        const sql = `update ${config.table} set ${softDeleteCol} = false where id = $1 returning id`;
        const [row] = await withAuditContext(session.sub, ip, (tx) => tx.unsafe(sql, [id] as never[]));
        if (!row) return NextResponse.json({ message: "Data tidak ditemukan." }, { status: 404 });
        return NextResponse.json({ message: "Data berhasil dinonaktifkan." });
      } else {
        const sql = `delete from ${config.table} where id = $1 returning id`;
        const [row] = await withAuditContext(session.sub, ip, (tx) => tx.unsafe(sql, [id] as never[]));
        if (!row) return NextResponse.json({ message: "Data tidak ditemukan." }, { status: 404 });
        return NextResponse.json({ message: "Data berhasil dihapus." });
      }
    } catch (err) {
      return errorResponse(err);
    }
  }

  return { GET, PUT, DELETE };
}
