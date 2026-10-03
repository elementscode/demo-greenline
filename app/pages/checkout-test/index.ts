import { Request, Response, NotFoundError, redirect, session } from "@elements/app";
import { authorizeJob } from "#app/shared/services/jobs";
import { testCheckout } from "#app/shared/stripe";
import html from "./template";

/** Stands in for Stripe's hosted checkout in development, until a key is set. */
export default function route(req: Request, res: Response) {
  if (!testCheckout()) {
    throw new NotFoundError();
  }

  if (!session.isLoggedIn()) {
    redirect(`/signin?next=${encodeURIComponent(`/jobs/${req.params.jobId}/pay`)}`);
    return;
  }

  let job = authorizeJob(req.params.jobId);

  if (session.get("role") !== "customer" || job.status !== "invoiced") {
    redirect(`/jobs/${job.id}`);
    return;
  }

  return new html({ job });
}
