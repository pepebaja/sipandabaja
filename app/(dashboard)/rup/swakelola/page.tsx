// app/(dashboard)/rup/swakelola/page.tsx — menu sidebar "RUP Swakelola"
import { requireSession } from "@/lib/auth/session";
import { RupClient } from "../RupClient";

export default async function RupSwakelolaPage() {
  await requireSession();
  return <RupClient initialTab="SWAKELOLA" />;
}
