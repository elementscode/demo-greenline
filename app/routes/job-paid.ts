import { Request, Response, redirect, session } from "@elements/app";
import { authorizeJob } from "#app/shared/services/jobs";
import { fulfillCheckout } from "#app/shared/services/payments";
import { stripeConfigured } from "#app/shared/stripe";

/**
 * Stripe's return trip. Confirms the session with Stripe so the page is right
 * even before the webhook lands; the webhook records it too, whichever is
 * first.
 */
export default async function route(req: Request, res: Response) {
  session.isLoggedInOrThrow();

  let job = authorizeJob(req.params.id);
  let sessionId = typeof req.query.session_id === "string" ? req.query.session_id : "";

  if (stripeConfigured() && sessionId) {
    await fulfillCheckout(sessionId);
  }

  redirect(`/jobs/${job.id}?paid=1`);
}
