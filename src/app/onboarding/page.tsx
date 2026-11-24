"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Compass,
  GraduationCap,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  LogOut,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  parseStudentRegNo,
  parseFacultyIdentifier,
  validateFourDigitPin,
} from "@/lib/auth/university-id";
import {
  signInWithUniversityCredentials,
  signOutUniversitySession,
} from "@/actions/auth.actions";

export default function OnboardingPage() {
  const router = useRouter();
  const [role, setRole] = useState<"STUDENT" | "FACULTY">("STUDENT");
  const [identifier, setIdentifier] = useState("");
  const [pin, setPin] = useState("");
  const [cohortId, setCohortId] = useState("cm0cohort2627000000000001");
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const parsedReg = useMemo(
    () => (role === "STUDENT" ? parseStudentRegNo(identifier) : null),
    [role, identifier]
  );

  const parsedFaculty = useMemo(
    () => (role === "FACULTY" ? parseFacultyIdentifier(identifier) : null),
    [role, identifier]
  );

  const isPinValid = validateFourDigitPin(pin);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    setErrorMessage(null);

    const result = await signInWithUniversityCredentials({
      loginMode: role,
      identifier,
      pin,
    });

    setIsPending(false);
    if (!result.ok) {
      setErrorMessage(result.error.message);
      return;
    }

    router.push(result.data.redirectTo);
    router.refresh();
  }

  async function handleSignOut() {
    await signOutUniversitySession();
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-bg-canvas py-10 px-4">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-[8px] border border-border-default bg-grad-ambient p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-brand-primary text-bg-surface">
                <Compass className="h-4 w-4" strokeWidth={1.75} />
              </div>
              <Badge variant="default">University Identity &amp; Cohort Scope</Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} />
              Go to Sign-In Page
            </Button>
          </div>
          <h1 className="mt-3 text-[24px] font-semibold tracking-tight text-text-primary">
            Verify University Registration No or Faculty Account
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            ProjectCompass automatically extracts your Batch Year, Intake Semester (Fall/Spring),
            and Academic Department (<code className="font-mono-tabular">CS / SE / AI / CY</code>)
            directly from your Registration Number.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Institutional Identity &amp; 4-Digit PIN Verification</CardTitle>
            <CardDescription>
              Choose your academic account type and enter your registered credentials.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setRole("STUDENT");
                    setIdentifier("");
                    setPin("");
                    setErrorMessage(null);
                  }}
                  className={`flex flex-col items-start rounded-[8px] border p-4 text-left transition-colors ${
                    role === "STUDENT"
                      ? "border-brand-primary bg-brand-tint/30"
                      : "border-border-default bg-bg-surface hover:bg-bg-subtle"
                  }`}
                >
                  <GraduationCap className="h-5 w-5 text-brand-primary" strokeWidth={1.75} />
                  <span className="mt-2 text-sm font-semibold text-text-primary">
                    Final-Year Student (Reg No)
                  </span>
                  <span className="mt-1 text-xs text-text-secondary">
                    Sign in with University Registration Number + 4-digit PIN.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRole("FACULTY");
                    setIdentifier("");
                    setPin("");
                    setErrorMessage(null);
                  }}
                  className={`flex flex-col items-start rounded-[8px] border p-4 text-left transition-colors ${
                    role === "FACULTY"
                      ? "border-brand-primary bg-brand-tint/30"
                      : "border-border-default bg-bg-surface hover:bg-bg-subtle"
                  }`}
                >
                  <Briefcase className="h-5 w-5 text-brand-primary" strokeWidth={1.75} />
                  <span className="mt-2 text-sm font-semibold text-text-primary">
                    Faculty Supervisor / Coordinator
                  </span>
                  <span className="mt-1 text-xs text-text-secondary">
                    Sign in with official University Email + 4-digit PIN. Role is resolved from the
                    institutional directory.
                  </span>
                </button>
              </div>

              {role === "STUDENT" ? (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary">
                      Student Registration Number
                    </label>
                    <Input
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value.toUpperCase())}
                      placeholder="e.g., B23F0184CS042"
                      className="font-mono-tabular text-base uppercase"
                      required
                    />
                  </div>

                  {parsedReg && (
                    <div className="rounded-[8px] border border-brand-primary/30 bg-brand-tint/30 p-3.5 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-brand-primary-hover">
                          Auto-Detected Academic Scope:
                        </span>
                        <Badge variant="default" className="font-mono-tabular">
                          {parsedReg.departmentCode}
                        </Badge>
                      </div>
                      <p className="text-text-primary">
                        <strong>{parsedReg.program}</strong> ·{" "}
                        <strong>
                          {parsedReg.intakeTerm} {parsedReg.batchYear} Batch
                        </strong>{" "}
                        · Form Serial <code className="font-mono-tabular">#{parsedReg.serialCode}</code>{" "}
                        · <strong>{parsedReg.departmentName}</strong> · Roll{" "}
                        <code className="font-mono-tabular">#{parsedReg.rollNumber}</code>
                      </p>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary">
                      Active FYP Cohort
                    </label>
                    <Select
                      value={cohortId}
                      onChange={(e) => setCohortId(e.target.value)}
                      aria-label="Active FYP Cohort"
                    >
                      <option value="cm0cohort2627000000000001">
                        FYP 2026-2027 (Fall 2026 – Spring 2027 · 24 Weeks)
                      </option>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary">
                    Official University Email
                  </label>
                  <Input
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="firstname.lastname@university.edu"
                    required
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  4-Digit Portal PIN (XXXX)
                </label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="••••"
                  className="font-mono-tabular tracking-[0.3em]"
                  required
                />
              </div>

              {errorMessage && (
                <div className="flex items-center gap-2 rounded-[6px] border border-status-error/30 bg-status-error-tint p-3 text-xs text-status-error-text">
                  <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-default pt-4">
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <CheckCircle2 className="h-4 w-4 text-status-success" strokeWidth={1.75} />
                  <span>HMAC Session &amp; Department RBAC Enforced</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" asChild>
                    <Link href="/sign-up">Create Account</Link>
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      isPending ||
                      !isPinValid ||
                      (role === "STUDENT" ? !parsedReg : !parsedFaculty)
                    }
                  >
                    <KeyRound className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                    <span>{isPending ? "Authenticating..." : "Verify & Enter Workspace"}</span>
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
