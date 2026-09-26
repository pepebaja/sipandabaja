// app/(dashboard)/master-data/metode-pengadaan/page.tsx
import { requireSession } from "@/lib/auth/session";
import { MasterDataManager } from "@/components/master-data/MasterDataManager";
import type { ColumnDef } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { FieldDef } from "@/components/master-data/field-types";

const columns: ColumnDef<any>[] = [
  { key: "kode", label: "Kode", sortable: true },
  { key: "nama", label: "Nama Metode", sortable: true },
  {
    key: "kategori_metode",
    label: "Kategori",
    render: (row) => (
      <span
        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
          row.kategori_metode === "E_KATALOG" ? "bg-sky-500/15 text-sky-300" : "bg-slate-500/15 text-slate-300"
        }`}
      >
        {row.kategori_metode === "E_KATALOG" ? "E-Katalog" : "Non E-Katalog"}
      </span>
    ),
  },
  { key: "status_aktif", label: "Status", render: (row) => <StatusBadge active={row.status_aktif} /> },
];

const fields: FieldDef[] = [
  { name: "kode", label: "Kode", type: "text", required: true },
  { name: "nama", label: "Nama Metode Pengadaan", type: "text", required: true },
  {
    name: "kategori_metode",
    label: "Kategori",
    type: "select",
    required: true,
    options: [
      { value: "E_KATALOG", label: "E-Katalog" },
      { value: "NON_EKATALOG", label: "Non E-Katalog" },
    ],
  },
  { name: "urutan", label: "Urutan Tampil", type: "number" },
  { name: "status_aktif", label: "Aktif", type: "checkbox" },
];

export default async function MetodePengadaanPage() {
  await requireSession();
  return (
    <MasterDataManager
      title="Metode Pengadaan"
      endpoint="/api/master-data/metode-pengadaan"
      columns={columns}
      fields={fields}
    />
  );
}
