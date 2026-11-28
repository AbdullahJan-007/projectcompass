"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, KeyRound, X } from "lucide-react";
import {
  getPortalNotifications,
  type PortalNotificationItem,
} from "@/actions/notifications.actions";
import { changeOwnPin } from "@/actions/auth.actions";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<PortalNotificationItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    getPortalNotifications()
      .then((res) => {
        if (active) {
          setItems(res);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  function handleToggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      getPortalNotifications()
        .then(setItems)
        .catch(() => {});
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        aria-label="Portal notifications"
        aria-expanded={open}
        data-testid="notification-bell-btn"
        className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#DBE2EF] bg-white text-[#43474E] hover:border-[#3F72AF]/50 hover:bg-[#DBE2EF]/40 hover:text-[#112D4E] transition-colors shadow-2xs"
      >
        <Bell aria-hidden="true" className="h-4 w-4" />
        {items.length > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#112D4E] px-1 text-[10px] font-bold text-white ring-2 ring-[#F9F7F7]">
            {items.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[90vw] rounded-xl border border-[#DBE2EF] bg-white shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#DBE2EF] bg-[#F9F7F7] px-3.5 py-2.5">
            <span className="text-xs font-bold text-[#112D4E]">
              Live Portal Alerts ({items.length})
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close notifications"
              className="rounded p-0.5 text-on-surface-variant hover:bg-[#DBE2EF]/60"
            >
              <X aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-[#DBE2EF]/70">
            {!loaded ? (
              <p className="p-4 text-center text-xs text-on-surface-variant">
                Loading notifications...
              </p>
            ) : items.length === 0 ? (
              <p className="p-5 text-center text-xs text-on-surface-variant">
                You are all caught up — no pending alerts right now.
              </p>
            ) : (
              items.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block px-3.5 py-2.5 hover:bg-[#F9F7F7] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full shrink-0",
                        item.tone === "success"
                          ? "bg-[#004F53]"
                          : item.tone === "warning"
                            ? "bg-[#B45309]"
                            : "bg-[#3F72AF]"
                      )}
                    />
                    <span className="text-xs font-semibold text-[#112D4E] truncate">
                      {item.title}
                    </span>
                  </div>
                  <p className="mt-0.5 pl-4 text-[11px] text-on-surface-variant line-clamp-2">
                    {item.description}
                  </p>
                  <p className="mt-1 pl-4 text-[10px] font-medium text-[#3F72AF] font-mono-tabular">
                    {item.timestamp}
                  </p>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function ChangePinButton() {
  const [open, setOpen] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    if (newPin !== confirmPin) {
      setFeedback({ type: "error", text: "New PIN and confirmation PIN do not match." });
      return;
    }
    setSaving(true);
    const res = await changeOwnPin({ currentPin, newPin });
    setSaving(false);

    if (!res.ok) {
      setFeedback({ type: "error", text: res.error.message });
      return;
    }
    setCurrentPin("");
    setNewPin("");
    setConfirmPin("");
    setFeedback({ type: "success", text: "4-digit PIN updated securely in database." });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setFeedback(null);
          setOpen(true);
        }}
        data-testid="sidebar-change-pin-btn"
        className="flex flex-1 items-center justify-center gap-1 rounded-md border border-[#DBE2EF] bg-[#F9F7F7] px-2 py-1.5 text-[11px] font-semibold text-[#112D4E] transition-colors hover:border-[#3F72AF]/50 hover:bg-[#DBE2EF]/50"
      >
        <KeyRound aria-hidden="true" className="h-3.5 w-3.5 text-[#3F72AF]" />
        <span>PIN</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#001833]/50 backdrop-blur-[2px] p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-[#DBE2EF] bg-white p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#DBE2EF] pb-3">
              <div>
                <h2 className="font-headline-sm text-base font-bold text-[#112D4E]">
                  Change 4-Digit Portal PIN
                </h2>
                <p className="text-xs text-on-surface-variant">
                  Updates your hashed login PIN immediately.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close change PIN dialog"
                className="rounded-lg p-1 text-on-surface-variant hover:bg-[#DBE2EF]/60"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>

            {feedback && (
              <div
                className={cn(
                  "rounded-lg border px-3 py-2 text-xs font-medium",
                  feedback.type === "success"
                    ? "border-[#71C9CE]/60 bg-[#E3FDFD] text-[#004F53]"
                    : "border-error/30 bg-error-container/60 text-on-error-container"
                )}
              >
                {feedback.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#112D4E] mb-1">
                  Current 4-Digit PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  required
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="••••"
                  className="w-full rounded-lg border border-[#DBE2EF] bg-[#F9F7F7] px-3 py-2 text-sm font-mono-tabular tracking-[0.35em] text-[#112D4E] focus:border-[#3F72AF] focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#112D4E] mb-1">
                  New 4-Digit PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  required
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="••••"
                  className="w-full rounded-lg border border-[#DBE2EF] bg-[#F9F7F7] px-3 py-2 text-sm font-mono-tabular tracking-[0.35em] text-[#112D4E] focus:border-[#3F72AF] focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#112D4E] mb-1">
                  Confirm New PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  required
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="••••"
                  className="w-full rounded-lg border border-[#DBE2EF] bg-[#F9F7F7] px-3 py-2 text-sm font-mono-tabular tracking-[0.35em] text-[#112D4E] focus:border-[#3F72AF] focus:bg-white focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-[#DBE2EF] px-3 py-1.5 text-xs font-semibold text-[#43474E] hover:bg-[#F9F7F7]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || currentPin.length !== 4 || newPin.length !== 4 || confirmPin.length !== 4}
                  className="rounded-lg bg-[#112D4E] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#001833] disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Update PIN"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
