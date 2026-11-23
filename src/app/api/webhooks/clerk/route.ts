import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { z } from "zod";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { logStructured } from "@/lib/logger";

const clerkWebhookEventSchema = z.object({
  type: z.enum(["user.created", "user.updated", "user.deleted"]),
  data: z.object({
    id: z.string().min(1),
    first_name: z.string().nullable().optional(),
    last_name: z.string().nullable().optional(),
    image_url: z.string().nullable().optional(),
    email_addresses: z
      .array(
        z.object({
          email_address: z.string().email(),
        })
      )
      .optional(),
  }),
});

export async function POST(req: Request): Promise<NextResponse> {
  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json(
      { error: "Missing Svix signature headers" },
      { status: 400 }
    );
  }

  const rawBody = await req.text();
  const wh = new Webhook(env.CLERK_WEBHOOK_SIGNING_SECRET);

  let verifiedPayload: unknown;
  try {
    verifiedPayload = wh.verify(rawBody, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });
  } catch {
    logStructured({
      level: "warn",
      action: "clerk_webhook_signature_invalid",
      status: "rejected",
    });
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  const parsed = clerkWebhookEventSchema.safeParse(verifiedPayload);
  if (!parsed.success) {
    return NextResponse.json({ status: "ignored_event_type" }, { status: 200 });
  }

  const { type, data } = parsed.data;

  try {
    if (type === "user.deleted") {
      await db.user.deleteMany({
        where: { clerkId: data.id },
      });
      logStructured({
        level: "info",
        action: "clerk_user_deleted",
        status: "ok",
      });
      return NextResponse.json({ status: "deleted" }, { status: 200 });
    }

    const email =
      data.email_addresses?.[0]?.email_address ?? `${data.id}@projectcompass.edu`;
    const fullName =
      [data.first_name, data.last_name].filter(Boolean).join(" ").trim() ||
      "Academic User";

    await db.user.upsert({
      where: { clerkId: data.id },
      update: {
        email,
        fullName,
        avatarUrl: data.image_url ?? null,
      },
      create: {
        clerkId: data.id,
        email,
        fullName,
        avatarUrl: data.image_url ?? null,
        role: "STUDENT",
      },
    });

    logStructured({
      level: "info",
      action: `clerk_${type}`,
      status: "ok",
    });

    return NextResponse.json({ status: "synchronized" }, { status: 200 });
  } catch {
    logStructured({
      level: "error",
      action: "clerk_webhook_db_error",
      status: "failed",
    });
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
