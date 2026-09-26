"use client";

// app/(dashboard)/master-data/program/ProgramClient.tsx
import { useState } from "react";
import { EntityPicker } from "@/components/master-data/EntityPicker";
import { MasterDataManager } from "@/components/master-data/MasterDataManager";
import type { ColumnDef } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { FieldDef } from "@/components/master-data/field-types";

const columns: ColumnDef<any>[] = [
  { key: "kode", label: "Kode", sortable: true },
  { key: "nama", label: "Nama Program", sortable: true },
  { key: "bidang_urusan", label: "Bidang Urusan" },
  { key: "status_aktif", label: "Status", render: (row) => <StatusBadge active={row.status_aktif} /> },
];

export function ProgramClient() {
  const [tahunId, setTahunId] = useState("");
  const [tahapanId, setTahapanId] = useState("");

  // Field form Program butuh tahun_anggaran_id & tahapan_anggaran_id — diisi
  // otomatis dari picker di atas lewat defaultValues pada MasterDataManager,
  // tapi tetap ditampilkan sebagai dependent-select agar bisa diubah manual
  // jika perlu (mis. memindahkan program ke tahapan lain).
  const fields: FieldDef[] = [
    {
      name: "tahun_anggaran_id",
      label: "Tahun Anggaran",
      type: "select",
      required: true,
      options: [], // diisi lewat initialValues dari picker; pola sederhana untuk MVP
    },
    {
      name: "tahapan_anggaran_id",
      label: "Tahapan Anggaran",
      type: "dependent-select",
      dependsOn: "tahun_anggaran_id",
      endpoint: "/api/master-data/tahapan-anggaran",
      parentQueryParam: "tahun_anggaran_id",
      optionLabelKey: "nama",
      required: true,
    },
    { name: "kode", label: "Kode Program", type: "text", required: true },
    { name: "nama", label: "Nama Program", type: "text", required: true },
    { name: "urusan", label: "Urusan", type: "text" },
    { name: "bidang_urusan", label: "Bidang Urusan", type: "text" },
    { name: "status_aktif", label: "Aktif", type: "checkbox" },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
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
      </div>

      <MasterDataManager
        title="Program"
        endpoint="/api/master-data/program"
        columns={columns}
        fields={fields}
        parentQueryParam="tahapan_anggaran_id"
        parentValue={tahapanId}
        defaultValues={{ tahun_anggaran_id: tahunId, tahapan_anggaran_id: tahapanId }}
      />
    </div>
  );
}
