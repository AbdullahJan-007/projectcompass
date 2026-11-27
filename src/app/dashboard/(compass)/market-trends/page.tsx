"use client";

import { useState } from "react";
import { Select } from "@/components/ui/select";
import { MARKET_TREND_SNAPSHOTS } from "@/lib/recommendation/seed-data";

export default function MarketTrendsPage() {
  const [demandFilter, setDemandFilter] = useState<string>("ALL");

  const visibleTrends = MARKET_TREND_SNAPSHOTS.filter(
    (t) => demandFilter === "ALL" || t.demandLevel === demandFilter
  );

  return (
    <div className="space-y-6">
      {/* Stitch Academic Navy Header */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-[#DBE2EF]">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#E3FDFD] border border-[#71C9CE]/50 text-[#004F53] text-[11px] font-semibold uppercase tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-[#004F53]" />
              IT &amp; Computing Industry Benchmarks
            </span>
            <span className="text-xs text-on-surface-variant">
              Versioned Hiring &amp; Stack Signal Matrix
            </span>
          </div>
          <h1 className="font-headline-md text-2xl sm:text-[28px] font-bold tracking-tight text-[#001833]">
            IT &amp; Computing Industry Demand &amp; Portfolio Signals
          </h1>
          <p className="text-sm text-on-surface-variant max-w-3xl">
            Curated industry demand tiers, high-signal stack pairings, and graduate hiring
            differentiators across BSIT, BSCS, BSSE, BSAI, BSCY, and BSDS specializations.
          </p>
        </div>

        <div className="w-full sm:w-52 shrink-0">
          <Select
            aria-label="Filter Demand Tier"
            value={demandFilter}
            onChange={(e) => setDemandFilter(e.target.value)}
          >
            <option value="ALL">All Demand Tiers</option>
            <option value="HIGH">HIGH Demand</option>
            <option value="GROWING">GROWING Demand</option>
            <option value="STEADY">STEADY Demand</option>
            <option value="NICHE">NICHE Demand</option>
          </Select>
        </div>
      </header>

      {visibleTrends.length === 0 ? (
        <div className="rounded-xl border border-[#DBE2EF] bg-surface-container-lowest p-8 text-center space-y-3">
          <h2 className="font-headline-sm text-lg font-bold text-[#112D4E]">
            No Market Snapshots Match Selected Filter
          </h2>
          <button
            type="button"
            onClick={() => setDemandFilter("ALL")}
            className="px-4 py-2 rounded-lg bg-[#112D4E] text-white text-xs font-semibold"
          >
            Show All Domains
          </button>
        </div>
      ) : (
        <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {visibleTrends.map((trend) => {
            const pillClass =
              trend.demandLevel === "HIGH"
                ? "bg-[#E3FDFD] text-[#004F53] border border-[#71C9CE]/50"
                : trend.demandLevel === "GROWING"
                  ? "bg-[#DBE2EF] text-[#112D4E]"
                  : trend.demandLevel === "STEADY"
                    ? "bg-[#FEF3C7] text-[#92400E]"
                    : "bg-[#112D4E] text-white";

            return (
              <article
                key={trend.id}
                className="rounded-xl border border-[#DBE2EF] bg-surface-container-lowest overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="h-1 w-full bg-[#112D4E]" />
                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${pillClass}`}
                      >
                        {trend.demandLevel} DEMAND
                      </span>
                      <span className="inline-flex items-center gap-1 font-mono-tabular text-xs font-semibold text-[#2A609C]">
                        <span
                          aria-hidden="true"
                          className="material-symbols-outlined text-[15px]"
                        >
                          trending_up
                        </span>
                        {trend.trendDirection}
                      </span>
                    </div>

                    <div>
                      <h2 className="font-title-md text-lg font-bold text-[#112D4E]">
                        {trend.domainName}
                      </h2>
                      <p className="text-xs text-[#3F72AF] font-medium mt-0.5">
                        {trend.sourceSummary}
                      </p>
                    </div>

                    <p className="text-xs sm:text-[13px] text-on-surface-variant leading-relaxed">
                      {trend.portfolioSignal}
                    </p>
                  </div>
                </div>

                <div className="px-5 pb-5 pt-3 border-t border-[#DBE2EF]/60 space-y-2 bg-[#F9F7F7]/50">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#3F72AF]">
                    <span aria-hidden="true" className="material-symbols-outlined text-[15px]">
                      layers
                    </span>
                    <span>In-Demand Stack Pairings</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {trend.topTechPairings.map((pairing) => (
                      <span
                        key={pairing}
                        className="inline-flex items-center gap-1 rounded bg-surface-container-lowest border border-[#DBE2EF] px-2 py-0.5 font-mono-tabular text-[11px] font-medium text-[#112D4E]"
                      >
                        {pairing}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
