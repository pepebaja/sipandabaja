"use client";

// components/master-data/MasterDataForm.tsx
//
// Versi Phase 5: menambahkan dukungan 'async-select' dan 'textarea' di atas
// versi Phase 4 — timpa file lama dengan ini (semua perilaku lama tetap
// sama persis untuk tipe text/number/checkbox/select/dependent-select).

import { useState } from "react";
import type { FieldDef } from "./field-types";
import { DependentSelect } from "./DependentSelect";
import { AsyncSelect } from "./AsyncSelect";

export function MasterDataForm({
  fields,
  initialValues,
  onSubmit,
  onCancel,
  submitting,
}: {
  fields: FieldDef[];
  initialValues: Record<string, unknown>;
  onSubmit: (values: Record<string, unknown>) => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [values, setValues] = useState<Record<string, unknown>>(initialValues);

  function setField(name: string, v: unknown) {
    setValues((prev) => ({ ...prev, [name]: v }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fields.map((field) => {
        const value = values[field.name];

        if (field.type === "text" || field.type === "number") {
          return (
            <div key={field.name}>
              <label className="mb-1.5 block text-sm font-medium text-slate-200">
                {field.label}
                {field.required && <span className="text-red-400"> *</span>}
              </label>
              <input
                type={field.type}
                required={field.required}
                placeholder={field.placeholder}
                value={(value as string | number | undefined) ?? ""}
                onChange={(e) =>
                  setField(field.name, field.type === "number" ? Number(e.target.value) : e.target.value)
                }
                className="w-full rounded-lg border border-slate-600 bg-[#0B1E3D] px-3 py-2 text-sm text-white outline-none focus:border-[#3FD8FF]"
              />
            </div>
          );
        }

        if (field.type === "textarea") {
          return (
            <div key={field.name}>
              <label className="mb-1.5 block text-sm font-medium text-slate-200">
                {field.label}
                {field.required && <span className="text-red-400"> *</span>}
              </label>
              <textarea
                required={field.required}
                placeholder={field.placeholder}
                rows={field.rows ?? 3}
                value={(value as string | undefined) ?? ""}
                onChange={(e) => setField(field.name, e.target.value)}
                className="w-full rounded-lg border border-slate-600 bg-[#0B1E3D] px-3 py-2 text-sm text-white outline-none focus:border-[#3FD8FF]"
              />
            </div>
          );
        }

        if (field.type === "checkbox") {
          return (
            <label key={field.name} className="flex items-center gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={Boolean(value ?? true)}
                onChange={(e) => setField(field.name, e.target.checked)}
                className="h-4 w-4 rounded border-slate-600 bg-[#0B1E3D] text-[#3FD8FF]"
              />
              {field.label}
            </label>
          );
        }

        if (field.type === "select") {
          return (
            <div key={field.name}>
              <label className="mb-1.5 block text-sm font-medium text-slate-200">
                {field.label}
                {field.required && <span className="text-red-400"> *</span>}
              </label>
              <select
                required={field.required}
                value={(value as string | undefined) ?? ""}
                onChange={(e) => setField(field.name, e.target.value)}
                className="w-full rounded-lg border border-slate-600 bg-[#0B1E3D] px-3 py-2 text-sm text-white outline-none focus:border-[#3FD8FF]"
              >
                <option value="">— Pilih —</option>
                {field.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          );
        }

        if (field.type === "async-select") {
          return (
            <AsyncSelect
              key={field.name}
              label={field.label}
              value={(value as string | undefined) ?? ""}
              onChange={(v) => setField(field.name, v)}
              endpoint={field.endpoint}
              optionLabelKey={field.optionLabelKey}
              required={field.required}
            />
          );
        }

        if (field.type === "dependent-select") {
          return (
            <DependentSelect
              key={field.name}
              label={field.label}
              value={(value as string | undefined) ?? ""}
              onChange={(v) => setField(field.name, v)}
              parentValue={values[field.dependsOn] as string | undefined}
              endpoint={field.endpoint}
              parentQueryParam={field.parentQueryParam}
              optionLabelKey={field.optionLabelKey}
              required={field.required}
            />
          );
        }

        return null;
      })}

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-[#3FD8FF] px-4 py-2 text-sm font-semibold text-[#0B1E3D] hover:brightness-95 disabled:opacity-60"
        >
          {submitting ? "Menyimpan..." : "Simpan"}
        </button>
      </div>
    </form>
  );
}
