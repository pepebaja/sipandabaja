// components/dpa/dpa-form-fields.ts
import type { FieldDef } from "@/components/master-data/field-types";

/**
 * Field form TAMBAH DPA — rantai dependent-select 4 tingkat. `program_id`
 * bergantung pada `tahapan_anggaran_id` yang TIDAK dirender sebagai field
 * (hanya ada di initialValues, diisi dari picker Tahun+Tahapan di halaman
 * DPA), tapi tetap terbaca oleh DependentSelect karena membaca dari objek
 * `values` form, bukan dari daftar field yang dirender.
 */
export function buildDpaCreateFields(): FieldDef[] {
  return [
    {
      name: "program_id",
      label: "Program",
      type: "dependent-select",
      dependsOn: "tahapan_anggaran_id",
      endpoint: "/api/master-data/program",
      parentQueryParam: "tahapan_anggaran_id",
      optionLabelKey: "nama",
      required: true,
    },
    {
      name: "kegiatan_id",
      label: "Kegiatan",
      type: "dependent-select",
      dependsOn: "program_id",
      endpoint: "/api/master-data/kegiatan",
      parentQueryParam: "program_id",
      optionLabelKey: "nama",
      required: true,
    },
    {
      name: "sub_kegiatan_id",
      label: "Sub Kegiatan",
      type: "dependent-select",
      dependsOn: "kegiatan_id",
      endpoint: "/api/master-data/sub-kegiatan",
      parentQueryParam: "kegiatan_id",
      optionLabelKey: "nama",
      required: true,
    },
    {
      name: "belanja_id",
      label: "Belanja (Kode Rekening)",
      type: "dependent-select",
      dependsOn: "sub_kegiatan_id",
      endpoint: "/api/master-data/belanja",
      parentQueryParam: "sub_kegiatan_id",
      optionLabelKey: "uraian_belanja",
      required: true,
    },
    { name: "uraian_belanja", label: "Uraian Belanja", type: "text", required: true },
    { name: "pagu_anggaran", label: "Pagu Anggaran (Rp)", type: "number", required: true, placeholder: "0" },
    {
      name: "sumber_dana_id",
      label: "Sumber Dana",
      type: "async-select",
      endpoint: "/api/master-data/sumber-dana",
      optionLabelKey: "nama",
    },
    { name: "keterangan", label: "Keterangan", type: "textarea" },
    {
      name: "status",
      label: "Status",
      type: "select",
      required: true,
      options: [
        { value: "DRAFT", label: "Draft" },
        { value: "AKTIF", label: "Aktif" },
        { value: "NONAKTIF", label: "Nonaktif" },
      ],
    },
  ];
}

/**
 * Field form EDIT DPA — sengaja TIDAK memuat pagu_anggaran/tahun/tahapan/
 * sub_kegiatan/belanja (perubahan nilai wajib lewat alur Revisi, bukan edit
 * biasa — lihat komentar di app/api/dpa/[id]/route.ts).
 */
export function buildDpaEditFields(): FieldDef[] {
  return [
    { name: "uraian_belanja", label: "Uraian Belanja", type: "text", required: true },
    {
      name: "sumber_dana_id",
      label: "Sumber Dana",
      type: "async-select",
      endpoint: "/api/master-data/sumber-dana",
      optionLabelKey: "nama",
    },
    { name: "keterangan", label: "Keterangan", type: "textarea" },
    {
      name: "status",
      label: "Status",
      type: "select",
      required: true,
      options: [
        { value: "DRAFT", label: "Draft" },
        { value: "AKTIF", label: "Aktif" },
        { value: "NONAKTIF", label: "Nonaktif" },
        { value: "DIARSIPKAN", label: "Diarsipkan" },
      ],
    },
  ];
}
