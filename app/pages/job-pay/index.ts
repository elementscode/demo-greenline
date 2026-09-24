import { Request, Response, redirect, session, ServerError } from "@elements/app";
import { authorizeJob } from "#app/shared/services/jobs";
import { startCheckout, stripeConfigured } from "#app/shared/services/payments";
import html from "./template";

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

  if (stripeConfigured()) {
    redirect(await startCheckout(job));
    return;
  }

  if (process.env.ENV !== "development") {
    throw new ServerError("Card payments are not configured.");
  }

  return new html({ job });
}
