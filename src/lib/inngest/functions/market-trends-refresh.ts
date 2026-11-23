import { inngest } from "@/lib/inngest/client";
import { db } from "@/lib/db";
import { MARKET_TREND_SNAPSHOTS } from "@/lib/recommendation/seed-data";

export const marketTrendsRefreshFunction = inngest.createFunction(
  {
    id: "market-trends-weekly-refresh",
  },
  { cron: "0 3 * * 1" },
  async ({ step }) => {
    return step.run("refresh-versioned-market-trends", async () => {
      let updatedCount = 0;
      for (const trend of MARKET_TREND_SNAPSHOTS) {
        await db.marketTrendSnapshot.upsert({
          where: { domainSlug: trend.domainSlug },
          update: {
            demandLevel: trend.demandLevel,
            trendDirection: trend.trendDirection,
            topTechPairings: trend.topTechPairings,
            portfolioSignal: trend.portfolioSignal,
            sourceSummary: trend.sourceSummary,
            versionLabel: trend.versionLabel,
            refreshedAt: new Date(),
          },
          create: {
            id: trend.id,
            domainSlug: trend.domainSlug,
            domainName: trend.domainName,
            demandLevel: trend.demandLevel,
            trendDirection: trend.trendDirection,
            topTechPairings: trend.topTechPairings,
            portfolioSignal: trend.portfolioSignal,
            sourceSummary: trend.sourceSummary,
            versionLabel: trend.versionLabel,
          },
        });
        updatedCount++;
      }
      return { updatedCount, versionLabel: "2026-Q4" };
    });
  }
);
