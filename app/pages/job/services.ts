import { sql, tx, ValidationError } from "@elements/app";
import { requireCompany } from "#app/shared/services/auth";
import { InvoiceCustomerJob } from "#app/jobs/invoice-customer";

/**
 * Completing a job enqueues its invoice in the same transaction, so a job
 * never sits completed with no invoice on the way.
 */
/** @rpc */
export function markComplete(jobId: string) {
  requireCompany();

  tx(() => {
    let done = sql<{ id: string }>(`
      update jobs
         set status = 'completed',
             completedAt = now()
       where id = ${jobId}
         and status = 'scheduled'
      returning id
    `).first();

    if (!done) {
      throw new ValidationError("This job is no longer scheduled.");
    }

    new InvoiceCustomerJob({ jobId }).schedule();
  });
}

/** For a job that is completed but not yet billed, like one entered by hand. */
/** @rpc */
export function sendInvoice(jobId: string) {
  requireCompany();

  let job = sql<{ id: string }>(`select id from jobs where id = ${jobId} and status = 'completed'`).first();

  if (!job) {
    throw new ValidationError("This job isn't waiting on an invoice.");
  }

  new InvoiceCustomerJob({ jobId }).schedule();
}
