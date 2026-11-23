import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { env } from "@/lib/env";
import { logStructured } from "@/lib/logger";

export async function POST(req: Request): Promise<NextResponse> {
  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json(
      { error: "Missing Resend Svix signature headers" },
      { status: 400 }
    );
  }

  const rawBody = await req.text();
  const wh = new Webhook(env.RESEND_WEBHOOK_SECRET);

  let eventPayload: { type?: string };
  try {
    eventPayload = wh.verify(rawBody, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as { type?: string };
  } catch {
    logStructured({
      level: "warn",
      action: "resend_webhook_signature_invalid",
      status: "rejected",
    });
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  logStructured({
    level: "info",
    action: "resend_webhook_received",
    status: eventPayload.type ?? "unknown",
  });

  return NextResponse.json({ status: "logged" }, { status: 200 });
}
