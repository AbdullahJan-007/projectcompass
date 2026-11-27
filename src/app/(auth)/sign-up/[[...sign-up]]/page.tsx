"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  parseStudentRegNo,
  validateFourDigitPin,
} from "@/lib/auth/university-id";
import { registerUniversityAccount } from "@/actions/auth.actions";
import { AppIcon } from "@/components/ui/app-icon";
import { ProjectCompassLogo } from "@/components/ui/project-compass-logo";
import { PakistanClock } from "@/components/ui/pakistan-clock";
import { getPakistanYear } from "@/lib/time/pakistan-time";

export default function SignUpPage() {
  const router = useRouter();
  const [studentName, setStudentName] = useState("");
  const [studentRegNo, setStudentRegNo] = useState("");
  const [studentPin, setStudentPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const parsedReg = useMemo(() => parseStudentRegNo(studentRegNo), [studentRegNo]);
  const isPinValid = validateFourDigitPin(studentPin);

  const isStudentFormValid =
    studentName.trim().length >= 3 && parsedReg !== null && isPinValid;

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
    <div className="bg-[#F9F7F7] font-body-md text-on-surface antialiased min-h-screen flex flex-col justify-between overflow-x-hidden">
      {/* Stitch Header */}
      <header className="fixed top-0 w-full z-50 bg-[#F9F7F7]/90 backdrop-blur-xl border-b border-[#DBE2EF]/80 shadow-[0_1px_8px_rgba(17,45,78,0.04)]">
        <div className="h-16 w-full max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 min-w-0">
            <ProjectCompassLogo className="w-9 h-9 rounded-lg shadow-xs shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="font-title-md text-base sm:text-[18px] leading-tight text-[#112D4E] font-bold tracking-tight truncate">
                ProjectCompass
              </span>
              <span className="font-label-sm text-[10px] text-[#3F72AF] uppercase tracking-wider font-semibold truncate">
                Dept. of IT &amp; Computing
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-4">
            <Link
              href="/"
              className="text-xs text-on-surface-variant hover:text-[#112D4E] transition-colors flex items-center gap-1 font-medium"
            >
              <AppIcon name="arrow_back" className="text-[16px]" />
              <span>Public Portal</span>
            </Link>
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-1 rounded-lg bg-[#DBE2EF]/60 px-3 py-1.5 text-xs font-semibold text-[#112D4E] hover:bg-[#DBE2EF] transition-colors"
            >
              <span>Portal Sign In</span>
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full pt-16 flex-1 flex flex-col justify-center items-center bg-[#F9F7F7] relative">
        <div className="flex flex-col w-full py-8 sm:py-12 px-4 items-center justify-center">
          <div className="w-full max-w-[520px] flex flex-col items-center">
            {/* Primary Elevation Card */}
            <div className="w-full bg-surface-container-lowest rounded-xl border border-[#DBE2EF] shadow-[0_8px_30px_rgba(17,45,78,0.06)] p-6 sm:p-8 relative animate-fade-in-up">
              {/* Academic Eyebrow & Status Flag */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#DBE2EF]/60 text-[#112D4E] text-[11px] uppercase tracking-wider font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3F72AF] animate-pulse" />
                  Student Onboarding · All Intakes
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-[#112D4E] font-semibold bg-[#E3FDFD] border border-[#71C9CE]/50 px-2.5 py-0.5 rounded-full">
                  <AppIcon name="school" className="text-[14px] text-[#3F72AF]" />
                  Student Portal
                </span>
              </div>

              {/* Header Section */}
              <div className="mb-6">
                <h1 className="font-headline-md text-2xl sm:text-[28px] text-[#112D4E] tracking-tight mb-1.5 font-bold">
                  Student Self-Registration
                </h1>
                <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                  Create your student account to explore final-year project ideas, connect with
                  faculty supervisors, and track your semester milestones across BSIT, BSCS, BSSE,
                  BSAI, BSCY, and BSDS.
                </p>
              </div>

              <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-5">
                {errorMessage && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-lg border border-error/30 bg-error-container/60 p-3 text-xs font-medium text-on-error-container"
                  >
                    <AppIcon name="error" className="text-[18px] shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Field 1: Full Legal Name */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="fullName"
                    className="text-xs font-semibold text-[#112D4E] flex items-center justify-between"
                  >
                    <span>Full Legal Name</span>
                    <span className="text-[11px] text-on-surface-variant font-normal">
                      As on your University ID
                    </span>
                  </label>
                  <div className="relative flex items-center">
                    <AppIcon name="badge" className="absolute left-3 text-[#3F72AF] text-[18px] pointer-events-none" />
                    <input
                      id="fullName"
                      data-testid="register-student-name"
                      type="text"
                      placeholder="e.g. Zainab Malik"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      required
                      className="w-full pl-9 pr-3 py-2.5 bg-[#F9F7F7] focus:bg-white text-on-surface text-sm rounded-lg border border-[#DBE2EF] focus:border-[#3F72AF] focus:outline-none focus:ring-2 focus:ring-[#71C9CE]/40 transition-all"
                    />
                  </div>
                </div>

                {/* Field 2: Registration Number with Live Decoding Engine */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="regNumber"
                      className="text-xs font-semibold text-[#112D4E] flex items-center gap-1.5"
                    >
                      <span>University Registration Number</span>
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-error inline-block"
                        title="Required field"
                      />
                    </label>
                    <span className="text-[11px] text-[#3F72AF] font-semibold">
                      {parsedReg ? "Verified Format" : "Auto-Decoded"}
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant">
                    Enter your roll number, e.g.{" "}
                    <span className="font-mono-tabular font-semibold text-[#112D4E]">
                      B22F0512IT042
                    </span>{" "}
                    or{" "}
                    <span className="font-mono-tabular font-semibold text-[#112D4E]">
                      B24F0184CS031
                    </span>
                  </p>
                  <div className="relative flex items-center">
                    <AppIcon name="fingerprint" className="absolute left-3 text-[#3F72AF] text-[18px] pointer-events-none" />
                    <input
                      id="regNumber"
                      data-testid="register-student-regno"
                      type="text"
                      placeholder="e.g., B22F0512IT042 or B24F0184CS031"
                      value={studentRegNo}
                      onChange={(e) => setStudentRegNo(e.target.value.toUpperCase())}
                      required
                      className="w-full pl-9 pr-10 py-2.5 uppercase bg-[#F9F7F7] focus:bg-white text-[#112D4E] font-mono-tabular text-sm tracking-wider rounded-lg border border-[#DBE2EF] focus:border-[#3F72AF] focus:outline-none focus:ring-2 focus:ring-[#71C9CE]/40 transition-all font-semibold"
                    />
                    <AppIcon name={parsedReg ? "check_circle" : "radio_button_unchecked"} className={`absolute right-3 text-[20px] ${
                        parsedReg ? "text-[#004F53]" : "text-outline"
                      }`} />
                  </div>

                  {/* Live Aqua Decoded Badge Pill */}
                  {parsedReg ? (
                    <div className="mt-1 p-3 rounded-lg bg-[#E3FDFD] border border-[#71C9CE]/60 text-[#112D4E] flex items-start gap-2.5 transition-all">
                      <AppIcon name="verified" className="text-[#004F53] text-[18px] mt-0.5 shrink-0" />
                      <div className="flex flex-col text-xs">
                        <span className="font-semibold">
                          {parsedReg.intakeTerm} {parsedReg.batchYear} · {parsedReg.departmentName} (
                          {parsedReg.departmentCode}) · Roll #{parsedReg.rollNumber}
                        </span>
                        <span className="text-[#004F53] font-mono-tabular text-[11px] mt-0.5">
                          Institutional ID: {parsedReg.universityEmail}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-on-surface-variant">
                      Pattern:{" "}
                      <code className="font-mono-tabular text-[#112D4E]">
                        B[YY][F/S][4-Digits][DEPT][3-Digits]
                      </code>{" "}
                      (IT, CS, SE, AI, CY, DS).
                    </p>
                  )}
                </div>

                {/* Field 3: Segmented 4-Digit Portal PIN Card */}
                <div className="p-4 rounded-xl bg-[#DBE2EF]/35 border border-[#DBE2EF] flex flex-col gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label
                        htmlFor="primaryPin"
                        className="text-xs font-semibold text-[#112D4E] flex items-center gap-1.5"
                      >
                        <AppIcon name="lock" className="text-[#3F72AF] text-[18px]" />
                        <span>Create 4-Digit Portal PIN</span>
                      </label>
                      <span
                        className={`text-[11px] font-semibold flex items-center gap-0.5 ${
                          isPinValid ? "text-[#004F53]" : "text-[#3F72AF]"
                        }`}
                      >
                        {isPinValid ? "4 Digits Ready ✓" : "Quick Sign-In"}
                      </span>
                    </div>
                    <p className="text-xs text-on-surface-variant leading-snug">
                      Choose a 4-digit numeric PIN to sign in and confirm your capstone proposals.
                    </p>
                  </div>

                  <div className="relative flex items-center">
                    <input
                      id="primaryPin"
                      data-testid="register-student-pin"
                      type={showPin ? "text" : "password"}
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="••••"
                      value={studentPin}
                      onChange={(e) =>
                        setStudentPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                      }
                      required
                      className="w-full px-3 py-2.5 text-center bg-white text-[#112D4E] font-mono-tabular text-base tracking-[0.45em] rounded-lg border border-[#DBE2EF] focus:border-[#3F72AF] focus:outline-none focus:ring-2 focus:ring-[#71C9CE]/40 transition-all font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin((prev) => !prev)}
                      aria-label="Toggle PIN visibility"
                      className="absolute right-2.5 text-[#3F72AF] hover:text-[#112D4E] p-1 rounded-md hover:bg-[#DBE2EF]/50 transition-colors"
                    >
                      <AppIcon name={showPin ? "visibility_off" : "visibility"} className="text-[18px]" />
                    </button>
                  </div>
                </div>

                {/* Primary Action CTA Button */}
                <button
                  type="submit"
                  data-testid="register-submit-btn"
                  disabled={!isStudentFormValid || isPending}
                  className="w-full h-11 bg-[#112D4E] hover:bg-[#3F72AF] disabled:opacity-50 disabled:pointer-events-none text-white text-sm font-semibold rounded-lg shadow-sm transition-all duration-200 flex items-center justify-center gap-2 group"
                >
                  <AppIcon name="how_to_reg" className="text-[20px]" />
                  <span>{isPending ? "Creating Student Account..." : "Create Student Account"}</span>
                  <AppIcon name="arrow_forward" className="text-[18px] transition-transform group-hover:translate-x-0.5" />
                </button>
              </form>

              {/* Friendly Faculty Notice (Strict Student-Only Boundary) */}
              <div className="mt-6 p-3.5 rounded-lg bg-[#DBE2EF]/40 border border-[#DBE2EF] text-[#112D4E] flex items-start gap-3">
                <AppIcon name="info" className="text-[#3F72AF] text-[20px] shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[#112D4E]">
                    Are you a Faculty Advisor or Coordinator?
                  </span>
                  <p className="text-xs text-on-surface-variant mt-0.5 leading-snug">
                    Faculty supervisors cannot self-register. Accounts are provisioned exclusively
                    by the Admin Command Center and sign in directly on the{" "}
                    <Link
                      href="/sign-in"
                      className="font-semibold text-[#2A609C] hover:text-[#112D4E] hover:underline"
                    >
                      Portal Sign-In
                    </Link>{" "}
                    page.
                  </p>
                </div>
              </div>
            </div>

            {/* Secondary Portal Navigation */}
            <div className="w-full mt-4 flex items-center justify-center gap-1.5 text-xs text-on-surface-variant">
              <span>Already have an account?</span>
              <Link
                href="/sign-in"
                className="text-[#2A609C] hover:text-[#112D4E] font-semibold hover:underline inline-flex items-center gap-0.5 transition-colors"
              >
                <span>Sign in here</span>
                <AppIcon name="chevron_right" className="text-[15px]" />
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-[#F9F7F7] border-t border-[#DBE2EF]/80 py-4">
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-on-surface-variant text-[11px]">
          <span className="flex items-center gap-1.5 font-semibold text-[#112D4E]">
            <span className="w-2 h-2 rounded-full bg-[#71C9CE]" />
            Faculty of IT &amp; Computing Sciences
          </span>
          <div className="flex items-center gap-3">
            <PakistanClock compact />
            <span>© {getPakistanYear()} ProjectCompass Academic Portal</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
