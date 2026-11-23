import { Resend } from "resend";
import { env } from "@/lib/env";
import { logStructured } from "@/lib/logger";

export interface EmailDispatchInput {
  to: string;
  subject: string;
  html: string;
}

export async function sendTransactionalEmail(
  input: EmailDispatchInput
): Promise<{ delivered: boolean; providerId?: string }> {
  const hasLiveResendKey =
    env.RESEND_API_KEY.startsWith("re_") &&
    !env.RESEND_API_KEY.includes("replace_me") &&
    !env.RESEND_API_KEY.includes("placeholder");

  if (!hasLiveResendKey) {
    logStructured({
      level: "info",
      action: "resend_email_simulated",
      status: "ok",
      meta: { subject: input.subject },
    });
    return { delivered: true, providerId: "sim_local_email" };
  }

  try {
    const resend = new Resend(env.RESEND_API_KEY);
    const response = await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });

    return {
      delivered: !response.error,
      providerId: response.data?.id,
    };
  } catch {
    logStructured({
      level: "warn",
      action: "resend_email_dispatch_failed",
      status: "degraded",
    });
    return { delivered: false };
  }
}
