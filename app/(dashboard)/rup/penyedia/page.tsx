// app/(dashboard)/rup/penyedia/page.tsx — menu sidebar "RUP Penyedia"
import { requireSession } from "@/lib/auth/session";
import { RupClient } from "../RupClient";

export default async function RupPenyediaPage() {
  await requireSession();
  return <RupClient initialTab="PENYEDIA" />;
}
