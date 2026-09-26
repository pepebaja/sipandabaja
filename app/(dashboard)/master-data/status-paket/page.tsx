// app/(dashboard)/master-data/status-paket/page.tsx
import { requireSession } from "@/lib/auth/session";
import { MasterDataManager } from "@/components/master-data/MasterDataManager";
import type { ColumnDef } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { FieldDef } from "@/components/master-data/field-types";

const columns: ColumnDef<any>[] = [
  { key: "urutan", label: "Urutan", sortable: true },
  { key: "kode", label: "Kode", sortable: true },
  { key: "nama", label: "Nama Status", sortable: true },
  { key: "is_final", label: "Status Akhir?", render: (row) => (row.is_final ? "Ya" : "Tidak") },
  { key: "status_aktif", label: "Status", render: (row) => <StatusBadge active={row.status_aktif} /> },
];

const fields: FieldDef[] = [
  { name: "kode", label: "Kode", type: "text", required: true },
  { name: "nama", label: "Nama Status Paket", type: "text", required: true },
  { name: "urutan", label: "Urutan Alur", type: "number", required: true },
  { name: "is_final", label: "Merupakan status akhir (Selesai Administrasi/Dibatalkan)", type: "checkbox" },
  { name: "status_aktif", label: "Aktif", type: "checkbox" },
];

export default async function StatusPaketPage() {
  await requireSession();
  return (
    <MasterDataManager title="Status Paket" endpoint="/api/master-data/status-paket" columns={columns} fields={fields} />
  );
}
