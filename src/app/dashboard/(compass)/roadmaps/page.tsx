import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { loadLatestRecommendationRunFromDb } from "@/lib/recommendation/live-context";

export default async function RoadmapsIndexPage() {
  const user = await requireRole(["STUDENT"]);
  const snap = await loadLatestRecommendationRunFromDb(user.id);

  const firstIdeaId = snap?.ideas?.[0]?.id;
  if (firstIdeaId) {
    redirect(`/dashboard/roadmaps/${firstIdeaId}`);
  }

  redirect("/dashboard/recommendations");
}
