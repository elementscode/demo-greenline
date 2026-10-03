import { test, assert, equal, sql } from "@elements/app";
import { payTestInvoice } from "./services";
import { authorizeJob, jobs } from "#app/shared/services/jobs";
import { startCheckout } from "#app/shared/services/payments";
import { testCheckout } from "#app/shared/stripe";
import { fixture, makeJob, loginAs, thrown } from "#app/shared/testing/fixtures";

function invoiced(customerId: string, serviceId: string, amountCents: number): string {
  let job = makeJob(customerId, serviceId, "invoiced");
  sql(`update jobs set amountCents = ${amountCents}, invoicedAt = now() where id = ${job}`);

  return job;
}

// Tests run against the environment's config. Without a Stripe key they drive
// the test checkout end to end; once a key is set, the test checkout is off
// and must refuse, and no test creates a real Stripe session.
if (!testCheckout()) {
  test("test checkout with a Stripe key set", async () => {
    test("refuses to record a payment", async () => {
      let f = fixture();
      let job = invoiced(f.alice, f.mowing, 6500);

      loginAs(f.alice);
      equal(await thrown(() => payTestInvoice(job)), "The test checkout is off.");
      equal(sql<{ status: string }>(`select status from jobs where id = ${job}`).firstOrThrow().status, "invoiced");
    });
  });
} else {
  test("test checkout", async () => {
    test("pay sends the customer to the test checkout, which marks the job paid", async () => {
      let f = fixture();
      let job = invoiced(f.alice, f.hedges, 12000);

      loginAs(f.alice);
      let url = await startCheckout(authorizeJob(job));
      equal(url, `/checkout/test/${job}`);

      payTestInvoice(job);

      let paid = sql<{ status: string; paidAt: Date | null; stripeSessionId: string }>(`
        select status, paidAt, stripeSessionId from jobs where id = ${job}
      `).firstOrThrow();

      equal(paid.status, "paid");
      assert(paid.paidAt !== null);
      equal(paid.stripeSessionId, `test_${job}`);
    });

    test("the paid job reaches the pages watching it", async () => {
      let f = fixture();
      let job = invoiced(f.alice, f.mowing, 6500);

      loginAs(f.alice);
      payTestInvoice(job);

      let row = jobs.view({ id: job }).get(job);
      equal(row?.status, "paid");
      equal(row?.amountCents, 6500);
    });

    test("paying twice is refused and changes nothing", async () => {
      let f = fixture();
      let job = invoiced(f.alice, f.mowing, 6500);

      loginAs(f.alice);
      payTestInvoice(job);
      equal(await thrown(() => payTestInvoice(job)), "This invoice isn't awaiting payment.");
      equal(sql<{ n: number }>(`select count(*)::int as n from jobs where id = ${job} and status = 'paid'`).firstOrThrow().n, 1);
    });

    test("another customer can't pay someone else's invoice", async () => {
      let f = fixture();
      let job = invoiced(f.alice, f.mowing, 6500);

      loginAs(f.bob);
      equal(await thrown(() => payTestInvoice(job)), "Job not found.");
      equal(sql<{ status: string }>(`select status from jobs where id = ${job}`).firstOrThrow().status, "invoiced");
    });

    test("a job that isn't invoiced yet can't be paid", async () => {
      let f = fixture();
      let job = makeJob(f.alice, f.mowing, "completed");

      loginAs(f.alice);
      equal(await thrown(() => payTestInvoice(job)), "This invoice isn't awaiting payment.");
    });
  });
}
