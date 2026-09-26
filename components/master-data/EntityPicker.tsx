"use client";

// components/master-data/EntityPicker.tsx
import { useEffect, useState } from "react";
import type { SelectOption } from "./field-types";

export function EntityPicker({
  label,
  endpoint,
  parentQueryParam,
  parentValue,
  optionLabelKey,
  value,
  onChange,
}: {
  label: string;
  endpoint: string;
  parentQueryParam?: string;
  parentValue?: string;
  optionLabelKey: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [options, setOptions] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (parentQueryParam && !parentValue) {
      setOptions([]);
      onChange("");
      return;
    }
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ pageSize: "100" });
    if (parentQueryParam && parentValue) params.set(parentQueryParam, parentValue);
    fetch(`${endpoint}?${params.toString()}`)
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
  }, [endpoint, parentQueryParam, parentValue, optionLabelKey]);

  return (
    <div className="mb-4 max-w-sm">
      <label className="mb-1.5 block text-sm font-medium text-slate-300">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading || (Boolean(parentQueryParam) && !parentValue)}
        className="w-full rounded-lg border border-slate-600 bg-[#0F2545] px-3 py-2 text-sm text-white outline-none focus:border-[#3FD8FF] disabled:opacity-50"
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
