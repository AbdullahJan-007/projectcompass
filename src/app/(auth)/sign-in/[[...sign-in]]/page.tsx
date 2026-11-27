"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const [showPin, setShowPin] = useState(false);
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
    setIdentifier("");
    setPin("");
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
    <div className="bg-[#F9F7F7] font-body-md text-on-surface antialiased min-h-screen flex flex-col justify-between overflow-x-hidden">
      {/* Stitch Top Header */}
      <header className="fixed top-0 w-full z-50 bg-[#F9F7F7]/90 backdrop-blur-xl border-b border-[#DBE2EF]/80">
        <div className="h-16 w-full px-4 sm:px-6 flex items-center justify-between max-w-7xl mx-auto">
          <Link href="/" className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-[#112D4E] text-[#E3FDFD] flex items-center justify-center font-headline-sm text-lg font-bold shadow-sm shrink-0">
              P
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-title-md text-base sm:text-[18px] text-[#112D4E] font-bold tracking-tight leading-tight truncate">
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
              className="font-label-md text-xs text-on-surface-variant hover:text-[#112D4E] transition-colors flex items-center gap-1 font-medium"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                arrow_back
              </span>
              <span>Public Portal</span>
            </Link>
            <Link
              href="/sign-up"
              className="hidden sm:inline-flex items-center gap-1 rounded-lg bg-[#DBE2EF]/60 px-3 py-1.5 text-xs font-semibold text-[#112D4E] hover:bg-[#DBE2EF] transition-colors"
            >
              <span>Student Sign Up</span>
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Centered Auth Card */}
      <main className="w-full pt-16 flex-1 flex flex-col justify-center items-center bg-[#F9F7F7] relative">
        <div className="flex flex-col w-full items-center justify-center py-8 sm:py-12 px-4">
          <div className="relative w-full max-w-[460px] animate-fade-in-up">
            <div
              aria-hidden="true"
              className="absolute -top-10 -left-10 w-44 h-44 rounded-full bg-[#71C9CE]/20 blur-3xl pointer-events-none"
            />
            <div
              aria-hidden="true"
              className="absolute -bottom-10 -right-10 w-44 h-44 rounded-full bg-[#3F72AF]/15 blur-3xl pointer-events-none"
            />

            <div className="relative bg-surface-container-lowest rounded-xl shadow-[0_12px_32px_rgba(17,45,78,0.06)] border border-[#DBE2EF] p-6 sm:p-8 flex flex-col gap-6">
              {/* Panel Header */}
              <div className="flex flex-col items-center text-center gap-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E3FDFD] border border-[#71C9CE]/40 text-[#112D4E] font-label-sm text-[11px] font-semibold tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#004F53]" />
                  <span>Academic Portal</span>
                </div>
                <h1 className="font-headline-md text-2xl sm:text-[26px] font-bold text-[#112D4E] tracking-tight mt-0.5">
                  Sign in to ProjectCompass
                </h1>
                <p className="text-xs sm:text-[13px] text-on-surface-variant max-w-[340px]">
                  Select your portal role and enter your university credentials and 4-digit PIN.
                </p>
              </div>

              {/* Segmented Tab Toggle */}
              <div
                className="bg-[#DBE2EF]/60 p-1 rounded-lg grid grid-cols-2 gap-1"
                role="tablist"
                aria-label="Portal Role"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={loginMode === "STUDENT"}
                  data-testid="tab-student-login"
                  onClick={() => switchMode("STUDENT")}
                  className={`py-2 px-3 rounded-md text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 ${
                    loginMode === "STUDENT"
                      ? "bg-[#112D4E] text-white shadow-sm"
                      : "text-on-surface-variant hover:text-[#112D4E]"
                  }`}
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                    school
                  </span>
                  <span>Student</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={loginMode === "FACULTY"}
                  data-testid="tab-faculty-login"
                  onClick={() => switchMode("FACULTY")}
                  className={`py-2 px-3 rounded-md text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 ${
                    loginMode === "FACULTY"
                      ? "bg-[#112D4E] text-white shadow-sm"
                      : "text-on-surface-variant hover:text-[#112D4E]"
                  }`}
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                    badge
                  </span>
                  <span>Faculty / Admin</span>
                </button>
              </div>

              {/* Unified Authentication Form */}
              <form onSubmit={handleSignIn} className="flex flex-col gap-4">
                {loginMode === "STUDENT" ? (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <label
                        htmlFor="student-reg-input"
                        className="text-xs text-[#112D4E] font-semibold"
                      >
                        Registration Number
                      </label>
                      <span className="font-mono-tabular text-[11px] text-on-surface-variant">
                        e.g. B23F0184CS042
                      </span>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#3F72AF]">
                        <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                          badge
                        </span>
                      </div>
                      <input
                        id="student-reg-input"
                        data-testid="login-identifier-input"
                        type="text"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value.toUpperCase())}
                        placeholder="e.g. B23F0184CS042"
                        autoComplete="username"
                        required
                        className="w-full pl-9 pr-3 py-2.5 bg-surface-container-lowest font-mono-tabular text-sm text-[#112D4E] tracking-wide uppercase rounded-lg border border-[#DBE2EF] focus:border-[#3F72AF] focus:ring-2 focus:ring-[#71C9CE]/40 transition-all outline-none"
                      />
                    </div>

                    {parsedReg && (
                      <div
                        data-testid="parsed-reg-badge"
                        className="mt-1 flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-[#E3FDFD] border border-[#71C9CE]/50 text-[#112D4E] text-xs font-medium"
                      >
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#004F53]" />
                          <span>
                            {parsedReg.intakeTerm} {parsedReg.batchYear} · {parsedReg.departmentCode}{" "}
                            · Roll #{parsedReg.rollNumber}
                          </span>
                        </span>
                        <span
                          aria-hidden="true"
                          className="material-symbols-outlined text-[15px] text-[#004F53]"
                        >
                          check_circle
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <label
                        htmlFor="faculty-id-input"
                        className="text-xs text-[#112D4E] font-semibold"
                      >
                        University Email
                      </label>
                      <span className="font-mono-tabular text-[11px] text-on-surface-variant">
                        @university.edu
                      </span>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#3F72AF]">
                        <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                          alternate_email
                        </span>
                      </div>
                      <input
                        id="faculty-id-input"
                        data-testid="login-identifier-input"
                        type="text"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="firstname.lastname@university.edu"
                        autoComplete="username"
                        required
                        className="w-full pl-9 pr-3 py-2.5 bg-surface-container-lowest text-sm text-[#112D4E] rounded-lg border border-[#DBE2EF] focus:border-[#3F72AF] focus:ring-2 focus:ring-[#71C9CE]/40 transition-all outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* 4-Digit Portal PIN Field */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="pin-input" className="text-xs text-[#112D4E] font-semibold">
                      4-Digit PIN
                    </label>
                    <span className="text-[11px] text-[#3F72AF] font-medium">
                      4 Numeric Digits
                    </span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#3F72AF]">
                      <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                        lock
                      </span>
                    </div>
                    <input
                      id="pin-input"
                      data-testid="login-pin-input"
                      type={showPin ? "text" : "password"}
                      inputMode="numeric"
                      maxLength={4}
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="••••"
                      autoComplete="current-password"
                      required
                      className="w-full pl-9 pr-10 py-2.5 bg-surface-container-lowest font-mono-tabular text-base tracking-[0.35em] text-[#112D4E] rounded-lg border border-[#DBE2EF] focus:border-[#3F72AF] focus:ring-2 focus:ring-[#71C9CE]/40 transition-all outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin((prev) => !prev)}
                      aria-label="Toggle PIN Visibility"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-on-surface-variant hover:text-[#112D4E] transition-colors"
                    >
                      <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                        {showPin ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                </div>

                {loginMode === "FACULTY" && (
                  <div className="p-3 rounded-lg bg-[#E3FDFD]/70 text-[#112D4E] flex items-start gap-2.5 border border-[#71C9CE]/40">
                    <span
                      aria-hidden="true"
                      className="material-symbols-outlined text-[#3F72AF] text-[18px] shrink-0 mt-0.5"
                    >
                      info
                    </span>
                    <p className="text-xs leading-relaxed">
                      Faculty supervisor, coordinator, and admin accounts are provisioned by the
                      department office. Contact the Admin Command Center for PIN resets.
                    </p>
                  </div>
                )}

                {errorMessage && (
                  <div
                    data-testid="login-error-banner"
                    role="alert"
                    className="flex items-start gap-2 rounded-lg border border-error/30 bg-error-container/60 p-3 text-xs font-medium text-on-error-container"
                  >
                    <span
                      aria-hidden="true"
                      className="material-symbols-outlined text-[18px] shrink-0"
                    >
                      error
                    </span>
                    <span>{errorMessage}</span>
                  </div>
                )}

                <button
                  type="submit"
                  data-testid="submit-university-login-btn"
                  disabled={
                    isPending ||
                    !isPinValid ||
                    (loginMode === "STUDENT" ? !parsedReg : !parsedFaculty)
                  }
                  className="w-full mt-1 py-2.5 px-4 rounded-lg bg-[#112D4E] hover:bg-[#3F72AF] disabled:opacity-50 disabled:pointer-events-none text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition-all duration-200"
                >
                  <span>
                    {isPending
                      ? "Signing In..."
                      : loginMode === "STUDENT"
                        ? "Sign In as Student"
                        : "Sign In to Faculty Portal"}
                  </span>
                  <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                    arrow_forward
                  </span>
                </button>
              </form>

              {/* Institutional Sign-Up Routing */}
              <div className="pt-3 border-t border-[#DBE2EF] flex flex-col items-center gap-3">
                <p className="text-xs text-on-surface-variant text-center">
                  New student in the department?{" "}
                  <Link
                    href="/sign-up"
                    className="text-[#2A609C] font-semibold hover:text-[#112D4E] hover:underline inline-flex items-center gap-0.5 transition-colors"
                  >
                    Create your student account
                  </Link>
                </p>
                <div className="w-full pt-1 flex items-center justify-between text-on-surface-variant text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#71C9CE]" />
                    <span>Portal Online</span>
                  </span>
                  <span className="flex items-center gap-1 text-[#112D4E] font-medium">
                    <span
                      aria-hidden="true"
                      className="material-symbols-outlined text-[14px] text-[#3F72AF]"
                    >
                      verified_user
                    </span>
                    <span>HMAC Session Protected</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Stitch Footer */}
      <footer className="w-full bg-[#DBE2EF]/35 border-t border-[#DBE2EF]/70 py-4">
        <div className="w-full px-4 sm:px-6 max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-on-surface-variant text-[11px]">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 font-semibold text-[#112D4E]">
              <span className="w-2 h-2 rounded-full bg-[#71C9CE]" />
              Department of IT &amp; Computing
            </span>
            <span>·</span>
            <span>All ComputingSpecializations</span>
          </div>
          <div>© ProjectCompass Academic Portal</div>
        </div>
      </footer>
    </div>
  );
}
