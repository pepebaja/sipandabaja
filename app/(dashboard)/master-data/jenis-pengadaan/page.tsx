// app/(dashboard)/master-data/jenis-pengadaan/page.tsx
import { requireSession } from "@/lib/auth/session";
import { MasterDataManager } from "@/components/master-data/MasterDataManager";
import type { ColumnDef } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { FieldDef } from "@/components/master-data/field-types";

const columns: ColumnDef<any>[] = [
  { key: "kode", label: "Kode", sortable: true },
  { key: "nama", label: "Nama Jenis Pengadaan", sortable: true },
  { key: "urutan", label: "Urutan", sortable: true },
  { key: "status_aktif", label: "Status", render: (row) => <StatusBadge active={row.status_aktif} /> },
];

const fields: FieldDef[] = [
  { name: "kode", label: "Kode", type: "text", required: true },
  { name: "nama", label: "Nama Jenis Pengadaan", type: "text", required: true },
  { name: "urutan", label: "Urutan Tampil", type: "number" },
  { name: "status_aktif", label: "Aktif", type: "checkbox" },
];

export default async function JenisPengadaanPage() {
  await requireSession();
  return (
    <MasterDataManager
      title="Jenis Pengadaan"
      endpoint="/api/master-data/jenis-pengadaan"
      columns={columns}
      fields={fields}
    />
  );
}
