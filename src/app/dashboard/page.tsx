import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME } from "@/lib/auth/university-id";
import { verifySessionToken } from "@/lib/auth/token-signer";

export default async function DashboardRootPage() {
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);

  if (!session) {
    redirect("/sign-in");
  }

  if (session.role === "ADMIN") {
    redirect("/dashboard/admin");
  }
  if (session.role === "COORDINATOR") {
    redirect("/dashboard/coordinator");
  }
  if (session.role === "SUPERVISOR") {
    redirect("/dashboard/supervisor");
  }

  redirect("/dashboard/recommendations");
}
