"use client";

import { useState } from "react";
import { TrendingUp, ArrowUpRight, Layers, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { MARKET_TREND_SNAPSHOTS } from "@/lib/recommendation/seed-data";

export default function MarketTrendsPage() {
  const [demandFilter, setDemandFilter] = useState<string>("ALL");
  const [viewState, setViewState] = useState<"POPULATED" | "LOADING" | "EMPTY" | "ERROR">(
    "POPULATED"
  );
  void setViewState;

  const visibleTrends = MARKET_TREND_SNAPSHOTS.filter(
    (t) => demandFilter === "ALL" || t.demandLevel === demandFilter
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border-default pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="info">Versioned Snapshot: 2026-Q4</Badge>
            <span className="text-xs text-text-muted">
              Refreshed weekly via scheduled Inngest cron job
            </span>
          </div>
          <h1 className="mt-2 text-[28px] font-semibold leading-[1.2] tracking-[-0.02em] text-text-primary">
            CS Market-Trend &amp; Portfolio Signal Insights
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Curated industry demand indicators, high-signal stack pairings, and graduate hiring
            differentiators linked directly to FYP recommendations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select
            aria-label="Filter Demand Tier"
            value={demandFilter}
            onChange={(e) => setDemandFilter(e.target.value)}
            className="w-48"
          >
            <option value="ALL">All Demand Tiers</option>
            <option value="HIGH">HIGH Demand</option>
            <option value="GROWING">GROWING Demand</option>
            <option value="STEADY">STEADY Demand</option>
            <option value="NICHE">NICHE Demand</option>
          </Select>
        </div>
      </div>

      {viewState === "LOADING" && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-52 w-full" />
          <Skeleton className="h-52 w-full" />
          <Skeleton className="h-52 w-full" />
        </div>
      )}

      {viewState === "ERROR" && (
        <Card className="border-status-error/30 bg-status-error-tint/30">
          <CardHeader>
            <CardTitle className="text-status-error-text">
              Market Trend Snapshot Load Error
            </CardTitle>
            <CardDescription className="text-status-error-text">
              Unable to query latest versioned domain snapshot from PostgreSQL.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => setViewState("POPULATED")}>
              <RefreshCw className="h-4 w-4" strokeWidth={1.75} />
              Reload 2026-Q4 Snapshot
            </Button>
          </CardContent>
        </Card>
      )}

      {viewState === "EMPTY" && (
        <Card className="bg-grad-ambient">
          <CardHeader>
            <CardTitle>No Market Snapshots Match Selected Filter</CardTitle>
            <CardDescription>
              Reset the demand tier filter to view all 12 computer science domain benchmarks.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => {
                setDemandFilter("ALL");
                setViewState("POPULATED");
              }}
            >
              Show All 12 Domains
            </Button>
          </CardContent>
        </Card>
      )}

      {viewState === "POPULATED" && (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {visibleTrends.map((trend) => (
            <Card key={trend.id} className="flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge
                    variant={
                      trend.demandLevel === "HIGH"
                        ? "success"
                        : trend.demandLevel === "GROWING"
                          ? "default"
                          : trend.demandLevel === "STEADY"
                            ? "amber"
                            : "info"
                    }
                  >
                    {trend.demandLevel} DEMAND
                  </Badge>
                  <span className="inline-flex items-center gap-1 font-mono-tabular text-xs font-medium text-brand-primary">
                    <TrendingUp className="h-3.5 w-3.5" strokeWidth={1.75} />
                    Trend: {trend.trendDirection}
                  </span>
                </div>
                <CardTitle className="mt-2">{trend.domainName}</CardTitle>
                <CardDescription className="text-xs">{trend.sourceSummary}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-text-secondary leading-relaxed">
                  {trend.portfolioSignal}
                </p>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                    <Layers className="h-3.5 w-3.5 text-brand-primary" strokeWidth={1.75} />
                    <span>In-Demand Stack Pairings</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {trend.topTechPairings.map((pairing) => (
                      <span
                        key={pairing}
                        className="inline-flex items-center gap-1 rounded-[4px] border border-border-default bg-bg-subtle px-2 py-0.5 font-mono-tabular text-[11px] text-text-primary"
                      >
                        {pairing}
                        <ArrowUpRight className="h-3 w-3 text-text-muted" />
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
