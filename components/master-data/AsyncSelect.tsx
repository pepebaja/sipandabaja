"use client";

// components/master-data/AsyncSelect.tsx
import { useEffect, useState } from "react";
import type { SelectOption } from "./field-types";

export function AsyncSelect({
  label,
  value,
  onChange,
  endpoint,
  optionLabelKey,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  endpoint: string;
  optionLabelKey: string;
  required?: boolean;
}) {
  const [options, setOptions] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`${endpoint}?pageSize=100`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        setOptions(
          (json.data ?? []).map((row: Record<string, unknown>) => ({
            value: String(row.id),
            label: String(row[optionLabelKey] ?? row.id),
          }))
        );
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, optionLabelKey]);

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-200">
        {label}
        {required && <span className="text-red-400"> *</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={loading}
        className="w-full rounded-lg border border-slate-600 bg-[#0B1E3D] px-3 py-2 text-sm text-white outline-none focus:border-[#3FD8FF] disabled:opacity-50"
      >
        <option value="">{loading ? "Memuat..." : "— Pilih —"}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
