// app/(dashboard)/rup/import/page.tsx
import { requireSession } from "@/lib/auth/session";
import { ImportClient } from "./ImportClient";

export default async function RupImportPage() {
  await requireSession();
  return <ImportClient />;
}
