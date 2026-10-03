import { ForbiddenError, ValidationError } from "@elements/app";
import { authorizeJob } from "#app/shared/services/jobs";
import { requireCustomer } from "#app/shared/services/auth";
import { recordPayment } from "#app/shared/services/payments";
import { testCheckout } from "#app/shared/stripe";

/**
 * Pays an invoice through the test checkout. The amount comes from the job
 * row, never the browser, and the payment is recorded by the same function a
 * Stripe payment uses.
 * @rpc
 */
export function payTestInvoice(jobId: string) {
  if (!testCheckout()) {
    throw new ForbiddenError("The test checkout is off.");
  }

  requireCustomer();

  let job = authorizeJob(jobId);

  if (job.status !== "invoiced" || job.amountCents === null) {
    throw new ValidationError("This invoice isn't awaiting payment.");
  }

  recordPayment(`test_${job.id}`, job.id, job.amountCents);
}
