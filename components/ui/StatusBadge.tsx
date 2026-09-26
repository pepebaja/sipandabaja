// components/ui/StatusBadge.tsx
export function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        active ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-500/15 text-slate-400"
      }`}
    >
      {active ? "Aktif" : "Nonaktif"}
    </span>
  );
}
