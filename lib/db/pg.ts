// lib/db/pg.ts
//
// Koneksi Postgres LANGSUNG (bukan lewat PostgREST/supabase-js) — dipakai
// khusus untuk operasi mutasi pada tabel yang punya trigger audit, karena
// trigger `sipanda_audit_trigger()` membaca session variable Postgres
// (`app.current_user_id`, `app.client_ip`) yang di-set lewat `SET LOCAL`.
// Session variable semacam ini hanya bermakna dalam SATU transaksi/koneksi
// yang sama — sesuatu yang tidak dijamin oleh supabase-js (tiap panggilan
// adalah request PostgREST terpisah), tapi terjamin di sini karena kita
// membungkus SET LOCAL + query mutasi dalam satu transaksi eksplisit.
//
// Gunakan connection string Supabase "Transaction Pooler" (port 6543) agar
// aman dipakai di lingkungan serverless (Vercel) tanpa menghabiskan koneksi.

import "server-only";
import postgres, { type TransactionSql } from "postgres";

const connectionString = process.env.DATABASE_URL; // Supabase transaction pooler URL
if (!connectionString) {
  throw new Error("DATABASE_URL env var wajib diisi (Supabase transaction pooler).");
}

// `prepare: false` wajib untuk mode transaction pooler (pgbouncer) Supabase.
const sql = postgres(connectionString, { prepare: false, max: 5 });

/**
 * Jalankan satu atau lebih query mutasi dalam SATU transaksi, dengan
 * `app.current_user_id` & `app.client_ip` sudah di-set lebih dulu lewat
 * SET LOCAL — sehingga trigger audit di database mencatat user_id & IP
 * yang benar untuk setiap baris yang berubah.
 *
 * Contoh pemakaian (di Route Handler / Server Action):
 *   await withAuditContext(session.sub, ip, async (tx) => {
 *     await tx`insert into dpa (...) values (...)`;
 *   });
 */
export async function withAuditContext<T>(
  userId: string | null,
  ip: string | null,
  callback: (tx: TransactionSql) => Promise<T>
): Promise<T> {
  return sql.begin(async (tx) => {
    if (userId) {
      await tx`select set_config('app.current_user_id', ${userId}, true)`;
    }
    if (ip) {
      await tx`select set_config('app.client_ip', ${ip}, true)`;
    }
    return callback(tx);
  });
}

export default sql;
