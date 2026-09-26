// app/(dashboard)/master-data/penyedia/page.tsx
import { requireSession } from "@/lib/auth/session";
import { MasterDataManager } from "@/components/master-data/MasterDataManager";
import type { ColumnDef } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { FieldDef } from "@/components/master-data/field-types";

const columns: ColumnDef<any>[] = [
  { key: "nama_penyedia", label: "Nama Penyedia", sortable: true },
  { key: "npwp", label: "NPWP" },
  { key: "jenis_usaha", label: "Jenis Usaha" },
  { key: "status_aktif", label: "Status", render: (row) => <StatusBadge active={row.status_aktif} /> },
];

const fields: FieldDef[] = [
  { name: "nama_penyedia", label: "Nama Penyedia", type: "text", required: true },
  { name: "nib", label: "NIB", type: "text" },
  { name: "npwp", label: "NPWP", type: "text" },
  { name: "alamat", label: "Alamat", type: "text" },
  { name: "kontak", label: "Kontak", type: "text" },
  { name: "jenis_usaha", label: "Jenis/Bentuk Usaha", type: "text" },
  { name: "status_aktif", label: "Aktif", type: "checkbox" },
];

export default async function PenyediaPage() {
  await requireSession();
  return <MasterDataManager title="Penyedia" endpoint="/api/master-data/penyedia" columns={columns} fields={fields} />;
}
