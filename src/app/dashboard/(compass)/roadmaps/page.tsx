import { redirect } from "next/navigation";
import { getActiveRecommendationsSnapshot } from "@/actions/recommendation.actions";

export default async function RoadmapsIndexPage() {
  const snap = await getActiveRecommendationsSnapshot();
  const firstIdeaId = snap.ideas?.[0]?.id;

  if (firstIdeaId) {
    redirect(`/dashboard/roadmaps/${firstIdeaId}`);
  }

  redirect("/dashboard/recommendations");
}
