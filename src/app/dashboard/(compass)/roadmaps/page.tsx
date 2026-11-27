import Link from "next/link";
import { redirect } from "next/navigation";
import { getActiveRecommendationsSnapshot } from "@/actions/recommendation.actions";
import { AppIcon } from "@/components/ui/app-icon";

export default async function RoadmapsIndexPage() {
  const snap = await getActiveRecommendationsSnapshot();
  const firstIdeaId = snap.ideas?.[0]?.id;

  if (firstIdeaId) {
    redirect(`/dashboard/roadmaps/${firstIdeaId}`);
  }

  return (
    <div className="mx-auto max-w-2xl py-10">
      <section className="rounded-2xl border border-[#DBE2EF] bg-surface-container-lowest p-8 text-center shadow-xs space-y-5">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#E3FDFD] text-[#004F53] border border-[#71C9CE]/50">
          <AppIcon name="alt_route" className="text-[24px]" />
        </div>
        <div className="space-y-2">
          <h1 className="font-headline-md text-2xl font-bold tracking-tight text-[#112D4E]">
            No Execution Roadmap Generated Yet
          </h1>
          <p className="text-sm text-on-surface-variant leading-relaxed max-w-md mx-auto">
            First complete your Skill &amp; Time Profile and generate your 3-Track FYP
            Recommendations. Once an idea is shortlisted, you can open its calibrated 24-week
            execution roadmap here.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          <Link
            href="/dashboard/recommendations"
            className="inline-flex items-center gap-2 rounded-lg bg-[#112D4E] px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-[#001833] transition-colors"
          >
            <AppIcon name="lightbulb" className="text-[16px]" />
            <span>Go to FYP Recommendations</span>
          </Link>
          <Link
            href="/dashboard/profile"
            className="inline-flex items-center gap-2 rounded-lg border border-[#DBE2EF] bg-[#F9F7F7] px-4 py-2.5 text-sm font-semibold text-[#112D4E] hover:bg-[#DBE2EF]/50 transition-colors"
          >
            <AppIcon name="badge" className="text-[16px]" />
            <span>Update Skill Profile</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
