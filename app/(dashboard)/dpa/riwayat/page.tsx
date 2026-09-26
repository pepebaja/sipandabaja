// app/(dashboard)/dpa/riwayat/page.tsx
import { requireSession } from "@/lib/auth/session";
import { RiwayatClient } from "./RiwayatClient";

export default async function RiwayatPage() {
  await requireSession();
  return <RiwayatClient />;
}
