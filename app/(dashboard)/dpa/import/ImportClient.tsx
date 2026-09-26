"use client";

// app/(dashboard)/dpa/import/ImportClient.tsx
import Link from "next/link";
import { useRef, useState } from "react";
import { EntityPicker } from "@/components/master-data/EntityPicker";
import { formatRupiah } from "@/lib/format/rupiah";
import { useToast } from "@/components/ui/Toast";

interface PreviewRow {
  rowNumber: number;
  raw: Record<string, unknown>;
  resolved?: {
    tahun_anggaran_id: string;
    tahapan_anggaran_id: string;
    sub_kegiatan_id: string;
    belanja_id: string;
    uraian_belanja: string;
    pagu_anggaran: number;
    sumber_dana_id: string | null;
    keterangan: string | null;
  };
  errors: string[];
}

type Step = "upload" | "preview" | "done";

export function ImportClient() {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tahunId, setTahunId] = useState("");
  const [tahapanId, setTahapanId] = useState("");
  const [step, setStep] = useState<Step>("upload");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file || !tahunId || !tahapanId) {
      toast.show("error", "Pilih Tahun Anggaran, Tahapan Anggaran, dan file terlebih dahulu.");
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("tahun_anggaran_id", tahunId);
      formData.append("tahapan_anggaran_id", tahapanId);

      const res = await fetch("/api/dpa/import/preview", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Gagal memproses file.");

      setPreview(json.rows);
      setStep("preview");
    } catch (err) {
      toast.show("error", err instanceof Error ? err.message : "Gagal memproses file.");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmImport() {
    if (!preview) return;
    const validRows = preview.filter((r) => r.errors.length === 0 && r.resolved).map((r) => r.resolved!);
    if (validRows.length === 0) {
      toast.show("error", "Tidak ada baris valid untuk diimpor.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/dpa/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: validRows }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Gagal menyimpan data import.");

      const errorCount = preview.length - validRows.length;
      setResultMessage(
        errorCount > 0
          ? `Import berhasil: ${json.inserted} data masuk, ${errorCount} data membutuhkan perbaikan.`
          : `Import berhasil: ${json.inserted} data masuk.`
      );
      toast.show("success", "Import selesai.");
      setStep("done");
    } catch (err) {
      toast.show("error", err instanceof Error ? err.message : "Gagal menyimpan data import.");
    } finally {
      setLoading(false);
    }
  }

  const validCount = preview?.filter((r) => r.errors.length === 0).length ?? 0;
  const errorCount = (preview?.length ?? 0) - validCount;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Import DPA</h1>
        <Link href="/dpa" className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 hover:bg-white/5">
          ‹ Kembali ke Data DPA
        </Link>
      </div>

      {/* Indikator langkah, sesuai alur Upload → Validasi → Preview → Cek Error → Konfirmasi → Import */}
      <div className="mb-6 flex items-center gap-2 text-xs text-slate-400">
        <StepDot active={step === "upload"} label="1. Upload" />
        <span>—</span>
        <StepDot active={step === "preview"} label="2. Preview & Cek Error" />
        <span>—</span>
        <StepDot active={step === "done"} label="3. Selesai" />
      </div>

      {step === "upload" && (
        <form onSubmit={handleUpload} className="max-w-lg space-y-4 rounded-2xl border border-white/10 bg-[#0F2545]/40 p-6">
          <EntityPicker
            label="Tahun Anggaran"
            endpoint="/api/master-data/tahun-anggaran"
            optionLabelKey="tahun"
            value={tahunId}
            onChange={(v) => {
              setTahunId(v);
              setTahapanId("");
            }}
          />
          <EntityPicker
            label="Tahapan Anggaran"
            endpoint="/api/master-data/tahapan-anggaran"
            parentQueryParam="tahun_anggaran_id"
            parentValue={tahunId}
            optionLabelKey="nama"
            value={tahapanId}
            onChange={setTahapanId}
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-200">File (.xlsx / .xls / .csv)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              required
              className="w-full rounded-lg border border-slate-600 bg-[#0B1E3D] px-3 py-2 text-sm text-white file:mr-3 file:rounded-md file:border-0 file:bg-[#3FD8FF] file:px-3 file:py-1.5 file:text-[#0B1E3D]"
            />
            <p className="mt-1 text-xs text-slate-400">
              Kolom wajib: Kode Program, Kode Kegiatan, Kode Sub Kegiatan, Kode Rekening, Uraian Belanja, Pagu
              Anggaran, Sumber Dana (opsional), Keterangan (opsional). Maks. 5 MB / 1000 baris.
            </p>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#3FD8FF] px-4 py-2 text-sm font-semibold text-[#0B1E3D] hover:brightness-95 disabled:opacity-60"
          >
            {loading ? "Memproses..." : "Validasi & Preview"}
          </button>
        </form>
      )}

      {step === "preview" && preview && (
        <div className="rounded-2xl border border-white/10 bg-[#0F2545]/40 p-4 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
            <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-emerald-300">{validCount} baris valid</span>
            <span className="rounded-full bg-red-500/15 px-3 py-1 text-red-300">{errorCount} baris bermasalah</span>
          </div>

          <div className="max-h-[420px] overflow-auto rounded-lg border border-white/10">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="sticky top-0 bg-[#0F2545]">
                <tr className="border-b border-white/10 text-slate-400">
                  <th className="px-3 py-2">Baris</th>
                  <th className="px-3 py-2">Uraian</th>
                  <th className="px-3 py-2 text-right">Pagu</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row) => (
                  <tr key={row.rowNumber} className={`border-b border-white/5 ${row.errors.length > 0 ? "bg-red-500/5" : ""}`}>
                    <td className="px-3 py-2 text-slate-400">{row.rowNumber}</td>
                    <td className="px-3 py-2 text-slate-200">{row.resolved?.uraian_belanja ?? String(row.raw.uraian_belanja ?? "-")}</td>
                    <td className="px-3 py-2 text-right text-slate-200">
                      {row.resolved ? formatRupiah(row.resolved.pagu_anggaran) : "-"}
                    </td>
                    <td className="px-3 py-2">
                      {row.errors.length === 0 ? (
                        <span className="text-emerald-400">Valid</span>
                      ) : (
                        <ul className="space-y-0.5 text-red-300">
                          {row.errors.map((e, i) => (
                            <li key={i}>{e}</li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-end gap-3">
            <button
              onClick={() => {
                setStep("upload");
                setPreview(null);
              }}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5"
            >
              Ulangi Upload
            </button>
            <button
              onClick={handleConfirmImport}
              disabled={loading || validCount === 0}
              className="rounded-lg bg-[#3FD8FF] px-4 py-2 text-sm font-semibold text-[#0B1E3D] hover:brightness-95 disabled:opacity-60"
            >
              {loading ? "Mengimpor..." : `Konfirmasi Import (${validCount} baris)`}
            </button>
          </div>
        </div>
      )}

      {step === "done" && (
        <div className="max-w-lg rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-sm text-emerald-200">
          <p className="mb-4">{resultMessage}</p>
          <Link href="/dpa" className="rounded-lg bg-[#3FD8FF] px-4 py-2 text-sm font-semibold text-[#0B1E3D] hover:brightness-95">
            Lihat Data DPA
          </Link>
        </div>
      )}
    </div>
  );
}

function StepDot({ active, label }: { active: boolean; label: string }) {
  return <span className={active ? "font-semibold text-[#3FD8FF]" : ""}>{label}</span>;
}
