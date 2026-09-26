// app/(dashboard)/dpa/import/page.tsx
import { requireSession } from "@/lib/auth/session";
import { ImportClient } from "./ImportClient";

export default async function ImportPage() {
  await requireSession();
  return <ImportClient />;
}
