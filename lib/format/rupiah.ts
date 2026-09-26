// lib/format/rupiah.ts
//
// Format Rupiah Indonesia sesuai aturan AS.15: "Rp100.000.000" (titik sebagai
// pemisah ribuan, tanpa desimal untuk nilai anggaran/kontrak/realisasi).

export function formatRupiah(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (n === null || n === undefined || Number.isNaN(n)) return "-";
  return "Rp" + Math.round(n).toLocaleString("id-ID");
}

/** Format persentase dengan guard pembagian oleh nol (aturan Z). */
export function formatPersen(numerator: number, denominator: number): string {
  if (!denominator || denominator === 0) return "-";
  const pct = (numerator / denominator) * 100;
  return `${pct.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`;
}

/** Format tanggal Indonesia DD/MM/YYYY sesuai aturan AS.16. */
export function formatTanggal(date: string | Date | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "-";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}
