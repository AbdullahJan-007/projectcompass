import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { SESSION_COOKIE_NAME } from "@/lib/auth/university-id";
import { verifySessionToken } from "@/lib/auth/token-signer";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const rawCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = verifySessionToken(rawCookie);

  if (!session) {
    redirect("/sign-in");
  }

  return (
    <AppShell
      userRole={session.role}
      userName={session.fullName}
      identifier={session.identifier}
      departmentCode={session.departmentCode || "BSIT"}
      batchLabel={session.batchLabel || `${session.departmentCode || "BSIT"} · IT & Computing`}
    >
      {children}
    </AppShell>
  );
}
