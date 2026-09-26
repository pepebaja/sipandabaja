// app/(dashboard)/master-data/sumber-dana/page.tsx
import { requireSession } from "@/lib/auth/session";
import { MasterDataManager } from "@/components/master-data/MasterDataManager";
import type { ColumnDef } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { FieldDef } from "@/components/master-data/field-types";

const columns: ColumnDef<any>[] = [
  { key: "nama", label: "Nama Sumber Dana", sortable: true },
  { key: "keterangan", label: "Keterangan" },
  { key: "status_aktif", label: "Status", render: (row) => <StatusBadge active={row.status_aktif} /> },
];

const fields: FieldDef[] = [
  { name: "nama", label: "Nama Sumber Dana", type: "text", required: true },
  { name: "keterangan", label: "Keterangan", type: "text" },
  { name: "status_aktif", label: "Aktif", type: "checkbox" },
];

export default async function SumberDanaPage() {
  await requireSession();
  return (
    <MasterDataManager title="Sumber Dana" endpoint="/api/master-data/sumber-dana" columns={columns} fields={fields} />
  );
}
