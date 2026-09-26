"use client";

// components/master-data/DependentSelect.tsx
import { useEffect, useState } from "react";
import type { SelectOption } from "./field-types";

export function DependentSelect({
  label,
  value,
  onChange,
  parentValue,
  endpoint,
  parentQueryParam,
  optionLabelKey,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  parentValue: string | undefined;
  endpoint: string;
  parentQueryParam: string;
  optionLabelKey: string;
  required?: boolean;
}) {
  const [options, setOptions] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!parentValue) {
      setOptions([]);
      onChange(""); // reset pilihan bila induk berubah/kosong — cegah kombinasi tidak valid
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`${endpoint}?${parentQueryParam}=${encodeURIComponent(parentValue)}&pageSize=100`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        const opts: SelectOption[] = (json.data ?? []).map((row: Record<string, unknown>) => ({
          value: String(row.id),
          label: String(row[optionLabelKey] ?? row.id),
        }));
        setOptions(opts);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentValue, endpoint, parentQueryParam, optionLabelKey]);

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-200">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={!parentValue || loading}
        className="w-full rounded-lg border border-slate-600 bg-[#0B1E3D] px-3 py-2 text-sm text-white outline-none focus:border-[#3FD8FF] disabled:opacity-50"
      >
        <option value="">{!parentValue ? "Pilih data induk terlebih dahulu" : loading ? "Memuat..." : "— Pilih —"}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
