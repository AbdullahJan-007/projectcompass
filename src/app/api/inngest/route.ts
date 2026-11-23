import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { archiveIngestFunction } from "@/lib/inngest/functions/archive-ingest";
import { marketTrendsRefreshFunction } from "@/lib/inngest/functions/market-trends-refresh";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [archiveIngestFunction, marketTrendsRefreshFunction],
});
