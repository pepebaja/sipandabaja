// lib/audit/logger.ts
//
// Trigger `sipanda_audit_trigger()` sudah otomatis mencatat CREATE/UPDATE/
// DELETE pada tabel transaksional (dpa, rup, paket_pengadaan, kontrak,
// realisasi, penilaian_kinerja_ppbj) — lihat lib/db/pg.ts::withAuditContext.
//
// Aksi LOGIN/LOGOUT (dan nanti IMPORT/EXPORT) bukan mutasi baris pada tabel
// ber-trigger, jadi dicatat eksplisit lewat helper ini.

import { supabaseAdmin } from "@/lib/db/supabase-admin";

export type AuditAction = "LOGIN" | "LOGOUT" | "IMPORT" | "EXPORT";

export async function logAuditEvent(params: {
  userId: string | null;
  action: AuditAction;
  module: string; // mis. 'auth', 'dpa-import', 'laporan-realisasi-bulanan'
  ipAddress: string | null;
  detail?: Record<string, unknown>;
}) {
  await supabaseAdmin.from("audit_logs").insert({
    user_id: params.userId,
    action: params.action,
    module: params.module,
    record_id: null,
    old_value: null,
    new_value: params.detail ?? null,
    ip_address: params.ipAddress,
  });
}
