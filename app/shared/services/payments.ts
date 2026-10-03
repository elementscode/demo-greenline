import { sql, getAppUrl } from "@elements/app";
import { Job } from "#app/shared/services/jobs";
import { stripe, testCheckout } from "#app/shared/stripe";
import { ensureWebhook } from "#app/shared/stripe-webhook";

/**
 * Returns the url to send the customer to: Stripe Checkout for exactly what
 * the invoice says is owed, or the in-app test checkout when no key is set.
 */
export async function startCheckout(job: Job): Promise<string> {
  if (testCheckout()) {
    return `/checkout/test/${job.id}`;
  }

  await ensureWebhook();

  let checkout = await stripe().checkout.sessions.create({
    mode: "payment",
    customer_email: job.customerEmail,
    client_reference_id: job.id,
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

  return checkout.url!;
}

/**
 * Records a paid session. Idempotent: the return page and the webhook both
 * call it, in either order, any number of times. Trusts only what it reads
 * back from Stripe, never a value the browser sent.
 */
export async function fulfillCheckout(sessionId: string): Promise<boolean> {
  let checkout = await stripe().checkout.sessions.retrieve(sessionId);

  if (checkout.payment_status !== "paid" || !checkout.client_reference_id) {
    return false;
  }

  recordPayment(checkout.id, checkout.client_reference_id, checkout.amount_total!);

  return true;
}

/**
 * The one place a payment is recorded, real or test. Only an invoiced job
 * moves to paid, so a repeat call changes nothing. The jobs trigger pushes the
 * change to every open page.
 */
export function recordPayment(sessionId: string, jobId: string, amountCents: number): boolean {
  let flipped = sql(`
    update jobs
       set status = 'paid',
           paidAt = now(),
           stripeSessionId = ${sessionId}
     where id = ${jobId}
       and status = 'invoiced'
    returning id
  `).first();

  return flipped !== undefined;
}
