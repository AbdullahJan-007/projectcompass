"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Compass,
  GraduationCap,
  Briefcase,
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
import { Select } from "@/components/ui/select";
import {
  parseStudentRegNo,
  parseFacultyIdentifier,
  validateFourDigitPin,
} from "@/lib/auth/university-id";
import { registerUniversityAccount } from "@/actions/auth.actions";

const FACULTY_DOMAIN_OPTIONS = [
  "DevTools",
  "Cybersecurity",
  "Applied AI",
  "EdTech",
  "HealthTech",
  "FinTech",
  "Cloud & Distributed Systems",
  "Data Engineering",
  "Computer Vision",
  "IoT & Embedded",
];

export default function SignUpPage() {
  const router = useRouter();
  const [accountType, setAccountType] = useState<"STUDENT" | "FACULTY">("STUDENT");

  // Student Fields
  const [studentName, setStudentName] = useState("");
  const [studentRegNo, setStudentRegNo] = useState("");
  const [studentPin, setStudentPin] = useState("");

  // Faculty Fields
  const [facultyName, setFacultyName] = useState("");
  const [facultyEmail, setFacultyEmail] = useState("");
  const [designation, setDesignation] = useState("Assistant Professor");
  const [departmentCode, setDepartmentCode] = useState<
    "BSCS" | "BSSE" | "BSAI" | "BSCY" | "BSDS" | "BSIT"
  >("BSCS");
  const [maxSlots, setMaxSlots] = useState(5);
  const [selectedDomains, setSelectedDomains] = useState<string[]>([
    "Applied AI",
    "Cybersecurity",
  ]);
  const [facultyPin, setFacultyPin] = useState("");

  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const parsedReg = useMemo(() => parseStudentRegNo(studentRegNo), [studentRegNo]);
  const parsedFaculty = useMemo(
    () => parseFacultyIdentifier(facultyEmail),
    [facultyEmail]
  );

  const isStudentFormValid =
    studentName.trim().length >= 3 &&
    parsedReg !== null &&
    validateFourDigitPin(studentPin);

  const isFacultyFormValid =
    facultyName.trim().length >= 3 &&
    parsedFaculty !== null &&
    !parseStudentRegNo(facultyEmail) &&
    validateFourDigitPin(facultyPin) &&
    selectedDomains.length >= 1;

  function toggleFacultyDomain(domain: string) {
    setSelectedDomains((prev) =>
      prev.includes(domain)
        ? prev.filter((d) => d !== domain)
        : prev.length < 5
          ? [...prev, domain]
          : prev
    );
  }

  async function handleRegisterSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setIsPending(true);

    const payload =
      accountType === "STUDENT"
        ? {
            accountType: "STUDENT" as const,
            fullName: studentName.trim(),
            identifier: studentRegNo.trim().toUpperCase(),
            pin: studentPin.trim(),
          }
        : {
            accountType: "FACULTY" as const,
            fullName: facultyName.trim(),
            identifier: facultyEmail.trim().toLowerCase(),
            pin: facultyPin.trim(),
            designation,
            departmentCode,
            maxSlots,
            researchDomains: selectedDomains,
          };

    const res = await registerUniversityAccount(payload);
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
      <div className="w-full max-w-lg space-y-5">
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

          <Button variant="ghost" size="sm" asChild>
            <Link href="/sign-in">
              <KeyRound className="h-3.5 w-3.5" strokeWidth={1.75} />
              Sign In
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader className="border-b border-border-default bg-bg-surface pb-5">
            <CardTitle className="text-[20px]">Create University Account</CardTitle>
            <CardDescription>
              Register your Student Registration Number or Faculty account to access the FYP
              workspace.
            </CardDescription>

            <div className="mt-4 grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setAccountType("STUDENT");
                  setErrorMessage(null);
                }}
                data-testid="register-tab-student"
                className={`flex items-center justify-center gap-2 rounded-[8px] border px-3 py-2.5 text-xs font-semibold transition-colors ${
                  accountType === "STUDENT"
                    ? "border-brand-primary bg-brand-primary text-bg-surface"
                    : "border-border-strong bg-bg-surface text-text-secondary hover:bg-bg-subtle"
                }`}
              >
                <GraduationCap className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                <span>Student</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAccountType("FACULTY");
                  setErrorMessage(null);
                }}
                data-testid="register-tab-faculty"
                className={`flex items-center justify-center gap-2 rounded-[8px] border px-3 py-2.5 text-xs font-semibold transition-colors ${
                  accountType === "FACULTY"
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
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              {accountType === "STUDENT" ? (
                <>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary">
                      Full Name
                    </label>
                    <Input
                      data-testid="register-student-name"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="Enter your full name"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary">
                      Registration Number
                    </label>
                    <Input
                      data-testid="register-student-regno"
                      value={studentRegNo}
                      onChange={(e) => setStudentRegNo(e.target.value.toUpperCase())}
                      placeholder="e.g., B23F0184CS042"
                      className="font-mono-tabular text-sm uppercase"
                      required
                    />

                    {parsedReg && (
                      <div className="flex items-center justify-between rounded-[6px] border border-brand-primary/25 bg-brand-tint/30 px-3 py-2 text-xs">
                        <span className="flex items-center gap-1.5 font-medium text-brand-primary-hover">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                          <span>
                            {parsedReg.program} · {parsedReg.intakeTerm} {parsedReg.batchYear} ·{" "}
                            {parsedReg.departmentName}
                          </span>
                        </span>
                        <Badge variant="default" className="font-mono-tabular">
                          {parsedReg.departmentCode}
                        </Badge>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary">
                      4-Digit PIN
                    </label>
                    <Input
                      data-testid="register-student-pin"
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={studentPin}
                      onChange={(e) =>
                        setStudentPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                      }
                      placeholder="••••"
                      className="font-mono-tabular text-base tracking-[0.35em]"
                      required
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary">
                        Full Name
                      </label>
                      <Input
                        data-testid="register-faculty-name"
                        value={facultyName}
                        onChange={(e) => setFacultyName(e.target.value)}
                        placeholder="Dr. Full Name"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary">
                        Designation
                      </label>
                      <Select
                        aria-label="Academic Designation"
                        value={designation}
                        onChange={(e) => setDesignation(e.target.value)}
                      >
                        <option value="Assistant Professor">Assistant Professor</option>
                        <option value="Associate Professor">Associate Professor</option>
                        <option value="Professor">Professor</option>
                        <option value="Senior Lecturer">Senior Lecturer</option>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary">
                      Official University Email
                    </label>
                    <Input
                      data-testid="register-faculty-email"
                      value={facultyEmail}
                      onChange={(e) => setFacultyEmail(e.target.value)}
                      placeholder="firstname.lastname@university.edu"
                      required
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary">
                        Department
                      </label>
                      <Select
                        aria-label="Faculty Department"
                        value={departmentCode}
                        onChange={(e) =>
                          setDepartmentCode(
                            e.target.value as
                              | "BSCS"
                              | "BSSE"
                              | "BSAI"
                              | "BSCY"
                              | "BSDS"
                              | "BSIT"
                          )
                        }
                      >
                        <option value="BSCS">BSCS</option>
                        <option value="BSSE">BSSE</option>
                        <option value="BSAI">BSAI</option>
                        <option value="BSCY">BSCY</option>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary">
                        Supervision Slots
                      </label>
                      <Input
                        type="number"
                        min={1}
                        max={15}
                        value={maxSlots}
                        onChange={(e) => setMaxSlots(Number(e.target.value) || 5)}
                        className="font-mono-tabular"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary">
                      Research Domains (Select 1–5)
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {FACULTY_DOMAIN_OPTIONS.map((d) => {
                        const active = selectedDomains.includes(d);
                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() => toggleFacultyDomain(d)}
                            className={`rounded-[6px] border px-2.5 py-1 text-xs font-medium transition-colors ${
                              active
                                ? "border-brand-primary bg-brand-tint text-brand-primary-hover"
                                : "border-border-default bg-bg-surface text-text-secondary hover:bg-bg-subtle"
                            }`}
                          >
                            {d}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary">
                      4-Digit PIN
                    </label>
                    <Input
                      data-testid="register-faculty-pin"
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={facultyPin}
                      onChange={(e) =>
                        setFacultyPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                      }
                      placeholder="••••"
                      className="font-mono-tabular text-base tracking-[0.35em]"
                      required
                    />
                  </div>
                </>
              )}

              {errorMessage && (
                <div
                  data-testid="register-error-banner"
                  className="flex items-center gap-2 rounded-[6px] border border-status-error/30 bg-status-error-tint p-3 text-xs font-medium text-status-error-text"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={
                  isPending ||
                  (accountType === "STUDENT" ? !isStudentFormValid : !isFacultyFormValid)
                }
                data-testid="register-submit-btn"
              >
                <UserPlus className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                <span>{isPending ? "Creating Account..." : "Create Account"}</span>
                <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              </Button>
            </form>

            <p className="mt-5 border-t border-border-default pt-4 text-center text-xs text-text-muted">
              Already have an account?{" "}
              <Link href="/sign-in" className="font-semibold text-brand-primary hover:underline">
                Sign in →
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
