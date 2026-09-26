// app/(dashboard)/master-data/tahapan-anggaran/page.tsx
import { requireSession } from "@/lib/auth/session";
import { TahapanAnggaranClient } from "./TahapanAnggaranClient";

export default async function TahapanAnggaranPage() {
  await requireSession();
  return <TahapanAnggaranClient />;
}
