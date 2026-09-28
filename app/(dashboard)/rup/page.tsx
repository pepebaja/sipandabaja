// app/(dashboard)/rup/page.tsx
import { requireSession } from "@/lib/auth/session";
import { RupClient } from "./RupClient";

export default async function RupPage() {
  await requireSession();
  return <RupClient initialTab="ALL" />;
}
