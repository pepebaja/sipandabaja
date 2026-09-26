// app/(dashboard)/master-data/program/page.tsx
import { requireSession } from "@/lib/auth/session";
import { ProgramClient } from "./ProgramClient";

export default async function ProgramPage() {
  await requireSession();
  return <ProgramClient />;
}
