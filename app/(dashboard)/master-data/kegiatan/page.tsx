// app/(dashboard)/master-data/kegiatan/page.tsx
import { requireSession } from "@/lib/auth/session";
import { KegiatanClient } from "./KegiatanClient";

export default async function KegiatanPage() {
  await requireSession();
  return <KegiatanClient />;
}
