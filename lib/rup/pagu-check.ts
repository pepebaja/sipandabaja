// lib/rup/pagu-check.ts
//
// Business rule AC.10 / catatan Section E & I: total pagu paket RUP yang
// terhubung ke satu baris DPA sebaiknya tidak melebihi pagu_anggaran DPA
// tersebut. Perilakunya configurable lewat tabel konfigurasi_validasi_rup
// (blokir keras, atau beri toleransi persentase, atau matikan sama sekali).

import { supabaseAdmin } from "@/lib/db/supabase-admin";

export interface PaguCheckResult {
  dpaPagu: number;
  totalPaguRupTerpakai: number; // termasuk RUP yang sedang diedit/dibuat ini
  sisaPagu: number; // dpaPagu - (totalPaguRupTerpakai TANPA RUP ini)
  melebihi: boolean;
  diblokir: boolean; // true bila konfigurasi memblokir & melebihi toleransi
  pesan: string | null;
}

export async function checkPaguRupTerhadapDpa(params: {
  dpaId: string;
  paguPaketBaru: number;
  excludeRupId?: string; // saat edit, jangan hitung dobel pagu RUP itu sendiri
}): Promise<PaguCheckResult> {
  const { dpaId, paguPaketBaru, excludeRupId } = params;

  const { data: dpaRow, error: dpaErr } = await supabaseAdmin
    .from("dpa")
    .select("pagu_anggaran")
    .eq("id", dpaId)
    .maybeSingle();
  if (dpaErr) throw dpaErr;
  if (!dpaRow) throw new Error("Data DPA terkait tidak ditemukan.");

  let query = supabaseAdmin.from("rup").select("id, pagu_paket").eq("dpa_id", dpaId).eq("status_aktif", true);
  if (excludeRupId) query = query.neq("id", excludeRupId);
  const { data: existingRup, error: rupErr } = await query;
  if (rupErr) throw rupErr;

  const totalPaguRupLain = (existingRup ?? []).reduce((sum, r) => sum + Number(r.pagu_paket), 0);
  const totalSetelahIni = totalPaguRupLain + paguPaketBaru;
  const dpaPagu = Number(dpaRow.pagu_anggaran);
  const sisaPagu = dpaPagu - totalPaguRupLain;

  const { data: konfigurasi } = await supabaseAdmin
    .from("konfigurasi_validasi_rup")
    .select("blokir_pagu_rup_melebihi_dpa, toleransi_persen")
    .limit(1)
    .maybeSingle();

  const toleransiPersen = konfigurasi?.toleransi_persen ?? 0;
  const batasToleransi = dpaPagu * (1 + toleransiPersen / 100);
  const melebihi = totalSetelahIni > dpaPagu;
  const melebihiToleransi = totalSetelahIni > batasToleransi;
  const diblokir = Boolean(konfigurasi?.blokir_pagu_rup_melebihi_dpa) && melebihiToleransi;

  let pesan: string | null = null;
  if (melebihi) {
    pesan = `Total pagu paket RUP (Rp${totalSetelahIni.toLocaleString("id-ID")}) ${
      diblokir ? "melebihi" : "melebihi (namun masih dalam toleransi)"
    } pagu DPA (Rp${dpaPagu.toLocaleString("id-ID")}).`;
  }

  return { dpaPagu, totalPaguRupTerpakai: totalSetelahIni, sisaPagu, melebihi, diblokir, pesan };
}
