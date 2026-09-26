"use client";

// components/ui/ConfirmDialog.tsx
//
// Dipakai di SETIAP aksi hapus/nonaktifkan di aplikasi (aturan AN: "Gunakan
// confirmation untuk delete") — jangan pernah panggil DELETE langsung dari
// klik tombol tanpa melalui komponen ini.

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Hapus",
  danger = true,
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4"
      role="alertdialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0F2545] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-2 text-base font-semibold text-white">{title}</h2>
        <p className="mb-5 text-sm text-slate-300">{description}</p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60 ${
              danger ? "bg-red-500 text-white hover:bg-red-600" : "bg-[#3FD8FF] text-[#0B1E3D] hover:brightness-95"
            }`}
          >
            {loading ? "Memproses..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
