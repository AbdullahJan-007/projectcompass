import Link from "next/link";
import {
  Compass,
  ShieldCheck,
  GitCompare,
  CalendarRange,
  ArrowRight,
  Lock,
  CheckCircle2,
  KeyRound,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-bg-canvas">
      <header className="border-b border-border-default bg-bg-surface">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-brand-primary text-bg-surface">
              <Compass className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div>
              <span className="text-base font-semibold tracking-tight text-text-primary">
                ProjectCompass
              </span>
              <span className="ml-2.5 rounded-[6px] border border-border-default bg-bg-subtle px-2 py-0.5 text-xs font-medium text-text-secondary">
                University FYP Portal
              </span>
            </div>
          </div>

          <nav className="flex items-center gap-2.5">
            <Button variant="ghost" asChild>
              <Link href="/sign-in">
                <KeyRound className="h-4 w-4" strokeWidth={1.75} />
                Sign In
              </Link>
            </Button>
            <Button asChild>
              <Link href="/sign-up">
                <UserPlus className="h-4 w-4" strokeWidth={1.75} />
                Create Account
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] px-6 py-10 space-y-10">
        <section className="rounded-[8px] border border-border-default bg-grad-ambient p-8 md:p-10">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
            <div className="space-y-4 lg:col-span-7">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="default">Fall 2026 – Spring 2027 Cohort</Badge>
                <Badge variant="neutral">BSCS · BSSE · BSAI · BSCY</Badge>
              </div>
              <h1 className="text-[28px] md:text-[34px] font-semibold leading-[1.2] tracking-[-0.02em] text-text-primary">
                Final-Year Project Evaluation, Archive Verification &amp; Faculty Supervision Portal
              </h1>
              <p className="text-[15px] leading-[1.6] text-text-secondary">
                Evaluate project scope against your weekly schedule, check similarity against
                archived department projects, connect with faculty supervisors who have available
                supervision slots, and plan your 24-week semester milestones.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button size="lg" asChild>
                  <Link href="/sign-in">
                    Sign In to Portal
                    <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link href="/sign-up">Create University Account</Link>
                </Button>
              </div>
            </div>

            <div className="lg:col-span-5">
              <Card className="border-border-strong/70">
                <CardHeader className="pb-3 border-b border-border-default bg-bg-subtle/60 rounded-t-[8px]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                      Institutional Workflow
                    </span>
                    <Badge variant="neutral">
                      <Lock className="mr-1 h-3 w-3" strokeWidth={1.75} />
                      Role-Protected
                    </Badge>
                  </div>
                  <CardTitle className="text-base">How ProjectCompass Works</CardTitle>
                </CardHeader>
                <CardContent className="divide-y divide-border-default pt-2 text-xs">
                  <div className="py-3 space-y-1">
                    <p className="font-semibold text-text-primary">
                      1. University Registration &amp; Sign In
                    </p>
                    <p className="text-text-secondary leading-relaxed">
                      Students authenticate with their University Registration Number and 4-digit
                      PIN. Faculty sign in with their official university email.
                    </p>
                  </div>

                  <div className="py-3 space-y-1">
                    <p className="font-semibold text-text-primary">
                      2. Feasibility &amp; Past-Archive Verification
                    </p>
                    <p className="text-text-secondary leading-relaxed">
                      Proposals are scored across Skill Overlap (40%), Time Fit (30%), Resource
                      Readiness (20%), and Supervisor Fit (10%), and checked against prior cohorts.
                    </p>
                  </div>

                  <div className="pt-3 space-y-1">
                    <p className="font-semibold text-text-primary">
                      3. Supervision Quota Allocation &amp; Roadmap
                    </p>
                    <p className="text-text-secondary leading-relaxed">
                      Submit proposals to faculty with open supervision capacity and generate a
                      calibrated 24-week execution schedule.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-[6px] bg-brand-tint text-brand-primary-hover">
                <ShieldCheck className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <CardTitle>Transparent Feasibility Scoring</CardTitle>
              <CardDescription>
                Every project proposal is evaluated across four clear criteria: Skill Overlap (40%),
                Time Fit (30%), Resource Readiness (20%), and Supervisor Fit (10%).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-[6px] border border-border-default bg-bg-subtle p-3 text-xs text-text-secondary font-mono-tabular">
                Score Breakdown: 84/100 (Skill 34/40 · Time 26/30 · Resource 16/20 · Supervisor
                8/10)
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-[6px] bg-accent-amber-tint text-status-warning-text">
                <GitCompare className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <CardTitle>Department Archive Duplicate Check</CardTitle>
              <CardDescription>
                Compares proposed topics against prior cohorts&apos; archived abstracts and requires
                a clear differentiation plan whenever similarity reaches{" "}
                <span className="font-mono-tabular">82%</span> or higher.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-[6px] border border-border-default bg-bg-subtle p-3 text-xs text-text-secondary font-mono-tabular">
                Archive Alert: Automated Server Log Visualizer (BSCS 2024 — 84% overlap)
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-[6px] bg-status-info-tint text-status-info-text">
                <CalendarRange className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <CardTitle>Verified Supervision Quotas &amp; Roadmaps</CardTitle>
              <CardDescription>
                Displays only faculty members with available supervision capacity and structures
                approved proposals into a 4-phase semester execution schedule.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-[6px] border border-border-default bg-bg-subtle p-3 text-xs text-text-secondary font-mono-tabular">
                Dr. Kamran Siddiqui · Distributed Systems (3 of 5 slots available)
              </div>
            </CardContent>
          </Card>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-border-default pt-6 text-xs text-text-muted">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-status-success" strokeWidth={1.75} />
            <span>
              ProjectCompass Academic Decision-Support System · Department of Computer Science
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/sign-up" className="hover:text-text-primary hover:underline">
              Create Account
            </Link>
            <Link href="/sign-in" className="hover:text-text-primary hover:underline">
              Portal Sign In
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
