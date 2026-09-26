"use client";

// app/(dashboard)/master-data/tahapan-anggaran/TahapanAnggaranClient.tsx
import { useState } from "react";
import { EntityPicker } from "@/components/master-data/EntityPicker";
import { MasterDataManager } from "@/components/master-data/MasterDataManager";
import type { ColumnDef } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { FieldDef } from "@/components/master-data/field-types";

const columns: ColumnDef<any>[] = [
  { key: "nama", label: "Tahapan", sortable: true },
  { key: "urutan", label: "Urutan", sortable: true },
  { key: "status_aktif", label: "Status", render: (row) => <StatusBadge active={row.status_aktif} /> },
];

const fields: FieldDef[] = [
  {
    name: "nama",
    label: "Tahapan",
    type: "select",
    required: true,
    options: [
      { value: "MURNI", label: "MURNI" },
      { value: "PERGESERAN", label: "PERGESERAN" },
      { value: "PERUBAHAN", label: "PERUBAHAN" },
    ],
  },
  { name: "urutan", label: "Urutan", type: "number", required: true, placeholder: "1, 2, atau 3" },
  { name: "status_aktif", label: "Jadikan tahapan aktif (konteks global aplikasi)", type: "checkbox" },
];

export function TahapanAnggaranClient() {
  const [tahunId, setTahunId] = useState("");

  return (
    <div>
      <EntityPicker
        label="Tahun Anggaran"
        endpoint="/api/master-data/tahun-anggaran"
        optionLabelKey="tahun"
        value={tahunId}
        onChange={setTahunId}
      />
      <MasterDataManager
        title="Tahapan Anggaran"
        endpoint="/api/master-data/tahapan-anggaran"
        columns={columns}
        fields={fields}
        parentQueryParam="tahun_anggaran_id"
        parentValue={tahunId}
      />
    </div>
  );
}
