import { Request, Response, redirect, session } from "@elements/app";
import { authorizeJob } from "#app/shared/services/jobs";
import { startCheckout } from "#app/shared/services/payments";

/**
 * The invoice email's pay link and the job page's Pay button. Sends the
 * customer to Stripe Checkout, or to the test checkout until a key is set.
 */
export default async function route(req: Request, res: Response) {
  if (!session.isLoggedIn()) {
    redirect(`/signin?next=${encodeURIComponent(`/jobs/${req.params.id}/pay`)}`);
    return;
  }

  let job = authorizeJob(req.params.id);

  if (session.get("role") !== "customer" || job.status !== "invoiced") {
    redirect(`/jobs/${job.id}`);
    return;
  }

  redirect(await startCheckout(job));
}
