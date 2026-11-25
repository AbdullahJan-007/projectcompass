import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME } from "@/lib/auth/university-id";
import { verifySessionToken } from "@/lib/auth/token-signer";

/**
 * Server-side route guard ensuring Student Execution Roadmaps are strictly isolated
 * to STUDENT accounts and never accessible from Faculty Supervisor, Coordinator, or Admin views.
 */
export default async function StudentRoadmapsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);

  if (!session) {
    redirect("/sign-in");
  }

  if (session.role !== "STUDENT") {
    if (session.role === "SUPERVISOR") redirect("/dashboard/supervisor");
    if (session.role === "COORDINATOR") redirect("/dashboard/coordinator");
    redirect("/dashboard/admin");
  }

  return <>{children}</>;
}
