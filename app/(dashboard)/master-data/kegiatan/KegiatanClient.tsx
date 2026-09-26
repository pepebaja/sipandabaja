"use client";

// app/(dashboard)/master-data/kegiatan/KegiatanClient.tsx
//
// Pola yang sama persis dipakai untuk halaman Sub Kegiatan (pilih Kegiatan
// di atas) dan Belanja (pilih Sub Kegiatan di atas) — cukup ganti endpoint,
// parentQueryParam, dan optionLabelKey sesuai tabel masing-masing.

import { useState } from "react";
import { EntityPicker } from "@/components/master-data/EntityPicker";
import { MasterDataManager } from "@/components/master-data/MasterDataManager";
import type { ColumnDef } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { FieldDef } from "@/components/master-data/field-types";

const columns: ColumnDef<any>[] = [
  { key: "kode", label: "Kode", sortable: true },
  { key: "nama", label: "Nama Kegiatan", sortable: true },
  { key: "status_aktif", label: "Status", render: (row) => <StatusBadge active={row.status_aktif} /> },
];

export function KegiatanClient() {
  const [programId, setProgramId] = useState("");

  const fields: FieldDef[] = [
    { name: "kode", label: "Kode Kegiatan", type: "text", required: true },
    { name: "nama", label: "Nama Kegiatan", type: "text", required: true },
    { name: "status_aktif", label: "Aktif", type: "checkbox" },
  ];

  return (
    <div>
      <EntityPicker
        label="Program"
        endpoint="/api/master-data/program"
        optionLabelKey="nama"
        value={programId}
        onChange={setProgramId}
      />

      <MasterDataManager
        title="Kegiatan"
        endpoint="/api/master-data/kegiatan"
        columns={columns}
        fields={fields}
        parentQueryParam="program_id"
        parentValue={programId}
        defaultValues={{ program_id: programId }}
      />
    </div>
  );
}
