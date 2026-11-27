"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import {
  formatPakistanClock,
  formatPakistanShortCalendarDate,
} from "@/lib/time/pakistan-time";
import { cn } from "@/lib/utils";

export interface PakistanClockProps {
  compact?: boolean;
  className?: string;
}

/**
 * Live Pakistan (Islamabad — Asia/Karachi, UTC+5) calendar & clock pill.
 * Hydrates cleanly without SSR mismatch and updates every second on the client.
 */
export function PakistanClock({ compact = false, className }: PakistanClockProps) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (!now) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-[#DBE2EF] bg-white px-2.5 py-1 text-[11px] font-medium text-[#43474E]",
          className
        )}
      >
        <Clock aria-hidden="true" className="h-3.5 w-3.5 text-[#3F72AF]" />
        <span>Islamabad, PKT</span>
      </span>
    );
  }

  return (
    <span
      title="Live Pakistan Standard Time (Islamabad · Asia/Karachi · UTC+5)"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-[#DBE2EF] bg-white px-2.5 py-1 text-[11px] font-medium text-[#112D4E] shadow-2xs font-mono-tabular",
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-[#71C9CE]" />
      {!compact && (
        <span className="text-[#43474E] hidden 2xl:inline">
          {formatPakistanShortCalendarDate(now)} ·
        </span>
      )}
      <span className="font-semibold text-[#112D4E]">{formatPakistanClock(now)}</span>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-[#3F72AF]">
        PKT
      </span>
    </span>
  );
}
