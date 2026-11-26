"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Compass,
  GraduationCap,
  ShieldCheck,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  KeyRound,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  parseStudentRegNo,
  validateFourDigitPin,
} from "@/lib/auth/university-id";
import { registerUniversityAccount } from "@/actions/auth.actions";

export default function SignUpPage() {
  const router = useRouter();
  const [studentName, setStudentName] = useState("");
  const [studentRegNo, setStudentRegNo] = useState("");
  const [studentPin, setStudentPin] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const parsedReg = useMemo(() => parseStudentRegNo(studentRegNo), [studentRegNo]);

  const isStudentFormValid =
    studentName.trim().length >= 3 &&
    parsedReg !== null &&
    validateFourDigitPin(studentPin);

  async function handleRegisterSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setIsPending(true);

    const res = await registerUniversityAccount({
      accountType: "STUDENT",
      fullName: studentName.trim(),
      identifier: studentRegNo.trim().toUpperCase(),
      pin: studentPin.trim(),
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
    <div className="min-h-screen bg-bg-canvas px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-lg space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-brand-primary text-bg-surface shadow-sm">
              <Compass className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <span className="font-heading text-xl font-bold tracking-tight text-text-primary">
              ProjectCompass
            </span>
          </Link>
          <Badge variant="default">Department of Information Technology &amp; Computing</Badge>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
            Student Account Registration
          </h1>
          <p className="text-sm text-text-secondary max-w-md">
            Register with your University Registration Number and a 4-digit Portal PIN across all
            Fall &amp; Spring batches (`BSIT`, `BSCS`, `BSSE`, `BSAI`, `BSCY`, `BSDS`).
          </p>
        </div>

        <Card className="border-border-default shadow-sm">
          <CardHeader className="border-b border-border-default bg-bg-subtle/60 pb-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-brand-primary" strokeWidth={1.75} />
              <CardTitle className="text-base">Final-Year Student Self-Registration</CardTitle>
            </div>
            <CardDescription>
              Your batch year, intake semester, IT program, and roll number are decoded
              automatically from your University Registration Number.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              {errorMessage && (
                <div
                  className="flex items-start gap-2 rounded-[6px] border border-status-error/30 bg-status-error-tint p-3 text-xs text-status-error-text"
                  role="alert"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Full Name
                </label>
                <Input
                  data-testid="register-student-name"
                  placeholder="e.g., Zainab Malik"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  University Registration Number
                </label>
                <Input
                  data-testid="register-student-regno"
                  placeholder="e.g., B22F0512IT042 or B24F0184CS031"
                  value={studentRegNo}
                  onChange={(e) => setStudentRegNo(e.target.value.toUpperCase())}
                  className="font-mono-tabular uppercase"
                  required
                />
                {parsedReg ? (
                  <div className="flex flex-wrap items-center gap-1.5 rounded-[6px] border border-status-success/30 bg-status-success-tint px-3 py-2 text-xs text-status-success-text">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span className="font-medium">
                      {parsedReg.intakeTerm} {parsedReg.batchYear} · {parsedReg.departmentName} (
                      {parsedReg.departmentCode}) · Roll #{parsedReg.rollNumber}
                    </span>
                  </div>
                ) : (
                  <p className="text-[11px] text-text-muted">
                    Format: <code className="font-mono-tabular">B[YY][F/S][4-Digits][DEPT][3-Digits]</code>{" "}
                    (supports IT, CS, SE, AI, CY, DS across any batch year).
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Create 4-Digit Portal PIN
                </label>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                  <Input
                    data-testid="register-student-pin"
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="4 numeric digits (e.g., 4821)"
                    value={studentPin}
                    onChange={(e) =>
                      setStudentPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                    }
                    className="pl-9 font-mono-tabular tracking-widest"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={!isStudentFormValid || isPending}
                data-testid="register-submit-btn"
              >
                <UserPlus className="h-4 w-4" strokeWidth={1.75} />
                {isPending ? "Creating Student Account..." : "Create Student Account"}
                <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
              </Button>
            </form>

            <div className="mt-6 rounded-[6px] border border-border-default bg-bg-subtle p-3.5 text-xs text-text-secondary space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-text-primary">
                <ShieldCheck className="h-4 w-4 text-brand-primary shrink-0" />
                <span>Faculty &amp; Supervisor Access Policy</span>
              </div>
              <p className="leading-relaxed">
                Faculty supervisors cannot self-register. All faculty accounts are provisioned
                exclusively by the University Admin Panel and sign in directly on the{" "}
                <Link href="/sign-in" className="font-medium text-brand-primary hover:underline">
                  Portal Sign-In
                </Link>{" "}
                page.
              </p>
            </div>

            <p className="mt-5 text-center text-xs text-text-secondary">
              Already have a Student, Faculty, or Admin account?{" "}
              <Link href="/sign-in" className="font-semibold text-brand-primary hover:underline">
                Sign in here
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
