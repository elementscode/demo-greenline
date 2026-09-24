import { ForbiddenError, ValidationError } from "@elements/app";
import { authorizeJob } from "#app/shared/services/jobs";
import { requireCustomer } from "#app/shared/services/auth";
import { markPaid, stripeConfigured } from "#app/shared/services/payments";

/** Stands in for Stripe in development until test keys are configured. */
/** @rpc */
export function simulatePayment(jobId: string) {
  requireCustomer();

  if (process.env.ENV !== "development" || stripeConfigured()) {
    throw new ForbiddenError("Simulated payments are only available in development.");
  }

  let job = authorizeJob(jobId);

  if (job.status !== "invoiced") {
    throw new ValidationError("This invoice isn't awaiting payment.");
  }

  markPaid(job.id, null);
}
