// app/(dashboard)/master-data/tahun-anggaran/page.tsx
import { requireSession } from "@/lib/auth/session";
import { MasterDataManager } from "@/components/master-data/MasterDataManager";
import type { ColumnDef } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { FieldDef } from "@/components/master-data/field-types";

const columns: ColumnDef<any>[] = [
  { key: "tahun", label: "Tahun", sortable: true },
  { key: "status_aktif", label: "Status", render: (row) => <StatusBadge active={row.status_aktif} /> },
];

const fields: FieldDef[] = [
  { name: "tahun", label: "Tahun Anggaran", type: "number", required: true, placeholder: "mis. 2027" },
  { name: "status_aktif", label: "Aktifkan tahun anggaran ini", type: "checkbox" },
];

export default async function TahunAnggaranPage() {
  await requireSession();
  return (
    <MasterDataManager
      title="Tahun Anggaran"
      endpoint="/api/master-data/tahun-anggaran"
      columns={columns}
      fields={fields}
    />
  );
}
