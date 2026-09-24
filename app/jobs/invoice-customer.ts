import { Job, email, sql } from "@elements/app";
import { findJob } from "#app/shared/services/jobs";
import { money, when } from "#app/shared/format";
import InvoiceReadyEmail from "#app/emails/invoice-ready";

export interface InvoiceCustomerJobFields {
  jobId: string;
}

/**
 * Bills a completed job at its service's fixed price and emails the customer
 * a payment link. A retry after the status moved still sends the email, since
 * that is the step that failed.
 */
export class InvoiceCustomerJob extends Job<InvoiceCustomerJobFields> {
  static maxAttempts = 5;

  run() {
    let { jobId } = this.fields;

    sql(`
      update jobs
         set status = 'invoiced',
             amountCents = (select priceCents from services where id = jobs.serviceId),
             invoicedAt = now()
       where id = ${jobId}
         and status = 'completed'
    `);

    let job = findJob(jobId);

    if (!job || job.status !== "invoiced") {
      return;
    }

    email({
      to: job.customerEmail,
      subject: `Your invoice for ${job.serviceName}: ${money(job.amountCents)}`,
      body: new InvoiceReadyEmail({
        customerName: job.customerName,
        serviceName: job.serviceName,
        amount: money(job.amountCents),
        scheduled: when(job.scheduledAt),
        address: job.address,
        payUrl: `/jobs/${job.id}/pay`,
      }),
    });
  }
}
