import { Request, Response, redirect, session } from "@elements/app";
import { authorizeJob } from "#app/shared/services/jobs";
import { confirmCheckout, stripeConfigured } from "#app/shared/services/payments";

/**
 * Stripe's return trip. Confirms the session with Stripe so the page is right
 * even before the webhook lands; the webhook stays the path that always runs.
 */
export default async function route(req: Request, res: Response) {
  session.isLoggedInOrThrow();

  let job = authorizeJob(req.params.id);
  let sessionId = typeof req.query.session_id === "string" ? req.query.session_id : "";

  if (stripeConfigured() && sessionId) {
    await confirmCheckout(job.id, sessionId);
  }

  redirect(`/jobs/${job.id}?paid=1`);
}
