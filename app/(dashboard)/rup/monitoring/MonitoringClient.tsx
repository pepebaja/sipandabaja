"use client";

// app/(dashboard)/rup/monitoring/MonitoringClient.tsx
import Link from "next/link";
import { useEffect, useState } from "react";
import { EntityPicker } from "@/components/master-data/EntityPicker";
import { useToast } from "@/components/ui/Toast";
import { formatRupiah, formatPersen } from "@/lib/format/rupiah";

interface Ringkasan {
  total_paket: number;
  total_pagu: number;
  jumlah_penyedia: number;
  pagu_penyedia: number;
  jumlah_swakelola: number;
  pagu_swakelola: number;
  jumlah_ekatalog: number;
  pagu_ekatalog: number;
  jumlah_non_ekatalog: number;
  pagu_non_ekatalog: number;
}
interface StatusRow {
  kode: string;
  nama: string;
  jumlah: number;
  pagu: number;
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="min-w-[190px] flex-1 rounded-2xl border border-white/10 bg-[#0F2545]/60 p-4 shadow">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-[#3FD8FF]">{sub}</p>}
    </div>
  );
}

export function MonitoringClient() {
  const toast = useToast();
  const [tahunId, setTahunId] = useState("");
  const [tahapanId, setTahapanId] = useState("");
  const [loading, setLoading] = useState(false);
  const [ringkasan, setRingkasan] = useState<Ringkasan | null>(null);
  const [perStatus, setPerStatus] = useState<StatusRow[]>([]);

  useEffect(() => {
    if (!tahunId || !tahapanId) {
      setRingkasan(null);
      setPerStatus([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/rup/monitoring?tahun_anggaran_id=${tahunId}&tahapan_anggaran_id=${tahapanId}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.message ?? "Gagal memuat data monitoring.");
        if (cancelled) return;
        setRingkasan(json.ringkasan);
        setPerStatus(json.per_status ?? []);
      })
      .catch((err) => !cancelled && toast.show("error", err instanceof Error ? err.message : "Gagal memuat data monitoring."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tahunId, tahapanId]);

  const total = ringkasan?.total_paket ?? 0;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Monitoring RUP</h1>
        <Link href="/rup" className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 hover:bg-white/5">
          ‹ Kembali ke Data RUP
        </Link>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <EntityPicker label="Tahun Anggaran" endpoint="/api/master-data/tahun-anggaran" optionLabelKey="tahun"
          value={tahunId} onChange={(v) => { setTahunId(v); setTahapanId(""); }} />
        <EntityPicker label="Tahapan Anggaran" endpoint="/api/master-data/tahapan-anggaran"
          parentQueryParam="tahun_anggaran_id" parentValue={tahunId} optionLabelKey="nama"
          value={tahapanId} onChange={setTahapanId} />
      </div>

      {!tahunId || !tahapanId ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Pilih Tahun Anggaran dan Tahapan Anggaran untuk melihat monitoring RUP.
        </div>
      ) : loading ? (
        <div className="h-32 animate-pulse rounded-2xl bg-white/10" />
      ) : !ringkasan || ringkasan.total_paket === 0 ? (
        <div className="rounded-lg border border-white/10 bg-[#0F2545]/40 px-4 py-10 text-center text-sm text-slate-400">
          Belum terdapat data yang tersedia pada periode dan tahapan anggaran yang dipilih.
        </div>
      ) : (
        <>
          <div className="mb-6 flex gap-3 overflow-x-auto pb-2">
            <Kpi label="Total Paket RUP" value={String(ringkasan.total_paket)} sub={formatRupiah(ringkasan.total_pagu)} />
            <Kpi label="RUP Penyedia" value={String(ringkasan.jumlah_penyedia)}
              sub={`${formatRupiah(ringkasan.pagu_penyedia)} · ${formatPersen(ringkasan.jumlah_penyedia, total)}`} />
            <Kpi label="RUP Swakelola" value={String(ringkasan.jumlah_swakelola)}
              sub={`${formatRupiah(ringkasan.pagu_swakelola)} · ${formatPersen(ringkasan.jumlah_swakelola, total)}`} />
            <Kpi label="E-Katalog" value={String(ringkasan.jumlah_ekatalog)}
              sub={`${formatRupiah(ringkasan.pagu_ekatalog)} · ${formatPersen(ringkasan.jumlah_ekatalog, total)}`} />
            <Kpi label="Non E-Katalog" value={String(ringkasan.jumlah_non_ekatalog)}
              sub={`${formatRupiah(ringkasan.pagu_non_ekatalog)} · ${formatPersen(ringkasan.jumlah_non_ekatalog, total)}`} />
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0F2545]/40 p-4 sm:p-6">
            <h2 className="mb-4 text-base font-semibold text-white">Paket per Status</h2>
            <div className="space-y-3">
              {perStatus.map((s) => {
                const pct = total > 0 ? Math.min(100, (s.jumlah / total) * 100) : 0;
                return (
                  <div key={s.kode}>
                    <div className="mb-1 flex items-center justify-between text-sm text-slate-200">
                      <span>{s.nama}</span>
                      <span className="text-slate-400">
                        {s.jumlah} paket · {formatRupiah(s.pagu)}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-[#3FD8FF]" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
