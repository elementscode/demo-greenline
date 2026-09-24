import Stripe from "stripe";
import { sql, getAppUrl } from "@elements/app";
import config from "#config";
import { Job } from "#app/shared/services/jobs";

let client: Stripe | undefined;

export function stripeConfigured(): boolean {
  return config.stripe.secretKey !== "";
}

export function stripe(): Stripe {
  client ??= new Stripe(config.stripe.secretKey);

  return client;
}

/** A Checkout Session for exactly what the invoice says is owed. */
export async function startCheckout(job: Job): Promise<string> {
  let checkout = await stripe().checkout.sessions.create({
    mode: "payment",
    customer_email: job.customerEmail,
    client_reference_id: job.id,
    metadata: { jobId: job.id },
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: job.amountCents!,
        product_data: { name: `${job.serviceName} · ${job.address}` },
      },
    }],
    success_url: `${getAppUrl()}/jobs/${job.id}/paid?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${getAppUrl()}/jobs/${job.id}?paid=0`,
  });

  sql(`update jobs set stripeSessionId = ${checkout.id} where id = ${job.id}`);

  return checkout.url!;
}

/**
 * Idempotent, since Stripe retries webhooks and the return page may confirm
 * the same payment first. The jobs trigger pushes the change to open pages.
 */
export function markPaid(jobId: string, stripeSessionId: string | null) {
  sql(`
    update jobs
       set status = 'paid',
           paidAt = now(),
           stripeSessionId = coalesce(${stripeSessionId}, stripeSessionId)
     where id = ${jobId}
       and status = 'invoiced'
  `);
}

/** True when Stripe says this session paid for this job. */
export async function confirmCheckout(jobId: string, sessionId: string): Promise<boolean> {
  let checkout = await stripe().checkout.sessions.retrieve(sessionId);

  if (checkout.client_reference_id !== jobId || checkout.payment_status !== "paid") {
    return false;
  }

  markPaid(jobId, checkout.id);

  return true;
}
