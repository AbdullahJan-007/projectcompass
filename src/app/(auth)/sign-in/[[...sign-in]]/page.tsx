"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Compass,
  GraduationCap,
  Briefcase,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  parseStudentRegNo,
  parseFacultyIdentifier,
  validateFourDigitPin,
} from "@/lib/auth/university-id";
import { signInWithUniversityCredentials } from "@/actions/auth.actions";

export default function SignInPage() {
  const router = useRouter();
  const [loginMode, setLoginMode] = useState<"STUDENT" | "FACULTY">("STUDENT");
  const [identifier, setIdentifier] = useState("");
  const [pin, setPin] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const parsedReg = useMemo(() => {
    if (loginMode !== "STUDENT") return null;
    return parseStudentRegNo(identifier);
  }, [loginMode, identifier]);

  const parsedFaculty = useMemo(() => {
    if (loginMode !== "FACULTY") return null;
    return parseFacultyIdentifier(identifier);
  }, [loginMode, identifier]);

  const isPinValid = validateFourDigitPin(pin);

  function switchMode(mode: "STUDENT" | "FACULTY") {
    setLoginMode(mode);
    setErrorMessage(null);
    if (mode === "STUDENT") {
      setIdentifier("");
      setPin("");
    } else {
      setIdentifier("");
      setPin("");
    }
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setIsPending(true);

    const res = await signInWithUniversityCredentials({
      loginMode,
      identifier,
      pin,
    });

    setIsPending(false);

    if (!res.ok) {
      setErrorMessage(res.error.message);
      return;
    }

    router.push(res.data.redirectTo);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-canvas px-4 py-12">
      <div className="w-full max-w-md space-y-5">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-brand-primary text-bg-surface">
              <Compass className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div>
              <span className="text-base font-semibold tracking-tight text-text-primary">
                ProjectCompass
              </span>
              <span className="ml-2 rounded-[6px] bg-bg-subtle px-2 py-0.5 text-xs font-medium text-text-muted">
                University Portal
              </span>
            </div>
          </Link>
          <Badge variant="neutral">Academic Sign In</Badge>
        </div>

        <Card>
          <CardHeader className="border-b border-border-default bg-bg-surface pb-5">
            <CardTitle className="text-[20px]">Sign In to Your Account</CardTitle>
            <CardDescription>
              Select your role and enter your university credentials and 4-digit PIN.
            </CardDescription>

            <div className="mt-4 grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => switchMode("STUDENT")}
                data-testid="tab-student-login"
                className={`flex items-center justify-center gap-2 rounded-[8px] border px-3 py-2.5 text-xs font-semibold transition-colors ${
                  loginMode === "STUDENT"
                    ? "border-brand-primary bg-brand-primary text-bg-surface"
                    : "border-border-strong bg-bg-surface text-text-secondary hover:bg-bg-subtle"
                }`}
              >
                <GraduationCap className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                <span>Student</span>
              </button>

              <button
                type="button"
                onClick={() => switchMode("FACULTY")}
                data-testid="tab-faculty-login"
                className={`flex items-center justify-center gap-2 rounded-[8px] border px-3 py-2.5 text-xs font-semibold transition-colors ${
                  loginMode === "FACULTY"
                    ? "border-brand-primary bg-brand-primary text-bg-surface"
                    : "border-border-strong bg-bg-surface text-text-secondary hover:bg-bg-subtle"
                }`}
              >
                <Briefcase className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                <span>Faculty</span>
              </button>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleSignIn} className="space-y-4">
              {loginMode === "STUDENT" ? (
                <div className="space-y-2">
                  <label
                    htmlFor="student-reg-input"
                    className="block text-xs font-semibold uppercase tracking-wider text-text-secondary"
                  >
                    Registration Number
                  </label>
                  <Input
                    id="student-reg-input"
                    data-testid="login-identifier-input"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value.toUpperCase())}
                    placeholder="e.g., B23F0184CS042"
                    className="font-mono-tabular text-sm tracking-wide uppercase"
                    autoComplete="username"
                    required
                  />

                  {parsedReg && (
                    <div
                      data-testid="parsed-reg-badge"
                      className="flex items-center justify-between rounded-[6px] border border-brand-primary/25 bg-brand-tint/30 px-3 py-2 text-xs"
                    >
                      <span className="flex items-center gap-1.5 font-medium text-brand-primary-hover">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                        <span>
                          {parsedReg.intakeTerm} {parsedReg.batchYear} · {parsedReg.departmentCode}{" "}
                          · Roll #{parsedReg.rollNumber}
                        </span>
                      </span>
                      <Badge variant="default" className="font-mono-tabular">
                        {parsedReg.departmentCode}
                      </Badge>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <label
                    htmlFor="faculty-id-input"
                    className="block text-xs font-semibold uppercase tracking-wider text-text-secondary"
                  >
                    University Email
                  </label>
                  <Input
                    id="faculty-id-input"
                    data-testid="login-identifier-input"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="firstname.lastname@university.edu"
                    autoComplete="username"
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <label
                  htmlFor="pin-input"
                  className="block text-xs font-semibold uppercase tracking-wider text-text-secondary"
                >
                  4-Digit PIN
                </label>
                <Input
                  id="pin-input"
                  data-testid="login-pin-input"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="••••"
                  className="font-mono-tabular text-base tracking-[0.35em]"
                  autoComplete="current-password"
                  required
                />
              </div>

              {errorMessage && (
                <div
                  data-testid="login-error-banner"
                  className="flex items-center gap-2 rounded-[6px] border border-status-error/30 bg-status-error-tint p-3 text-xs font-medium text-status-error-text"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                  <span>{errorMessage}</span>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={
                  isPending ||
                  !isPinValid ||
                  (loginMode === "STUDENT" ? !parsedReg : !parsedFaculty)
                }
                data-testid="submit-university-login-btn"
              >
                <KeyRound className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                <span>{isPending ? "Signing In..." : "Sign In"}</span>
                <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              </Button>
            </form>

            <div className="mt-5 flex items-center justify-between border-t border-border-default pt-4 text-xs text-text-muted">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-brand-primary" strokeWidth={1.75} />
                <span>New to the portal?</span>
              </div>
              <Link
                href="/sign-up"
                className="font-semibold text-brand-primary hover:underline"
              >
                Create an account →
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
