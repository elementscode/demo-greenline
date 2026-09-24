import { test, assert, equal, session, sql } from "@elements/app";
import { markComplete, sendInvoice } from "./services";
import { authorizeJob } from "#app/shared/services/jobs";
import { comments } from "#app/shared/services/comments";
import { markPaid } from "#app/shared/services/payments";
import { InvoiceCustomerJob } from "#app/jobs/invoice-customer";
import { NotifyCommentJob } from "#app/jobs/notify-comment";
import { fixture, makeJob, loginAs, thrown } from "#app/shared/testing/fixtures";

function status(jobId: string): string {
  return sql<{ status: string }>(`select status from jobs where id = ${jobId}`).firstOrThrow().status;
}

test("job access", async () => {
  test("a customer sees only their own jobs", async () => {
    let f = fixture();
    let job = makeJob(f.alice, f.mowing);

    loginAs(f.alice);
    equal(authorizeJob(job).id, job);

    loginAs(f.bob);
    equal(await thrown(() => authorizeJob(job)), "Job not found.");
  });

  test("any company user sees every job", async () => {
    let f = fixture();
    let job = makeJob(f.alice, f.mowing);

    loginAs(f.company);
    equal(authorizeJob(job).customerName, "Alice");
  });
});

test("job lifecycle", async () => {
  test("mark complete, invoice at the service price, then paid", async () => {
    let f = fixture();
    let job = makeJob(f.alice, f.hedges);

    loginAs(f.company);
    markComplete(job);
    equal(status(job), "completed");

    let queued = sql<{ n: number }>(`
      select count(*)::int as n from elements.jobs where fields->>'jobId' = ${job}
    `).firstOrThrow();
    equal(queued.n, 1);

    new InvoiceCustomerJob({ jobId: job }).run();

    let billed = sql<{ status: string; amountCents: number }>(`select status, amountCents from jobs where id = ${job}`).firstOrThrow();
    equal(billed.status, "invoiced");
    equal(billed.amountCents, 12000);

    markPaid(job, "cs_test_1");
    markPaid(job, "cs_test_2");

    let paid = sql<{ status: string; stripeSessionId: string }>(`select status, stripeSessionId from jobs where id = ${job}`).firstOrThrow();
    equal(paid.status, "paid");
    equal(paid.stripeSessionId, "cs_test_1");
  });

  test("customers can't mark jobs complete", async () => {
    let f = fixture();
    let job = makeJob(f.alice, f.mowing);

    loginAs(f.alice);
    equal(await thrown(() => markComplete(job)), "Company account required.");
    equal(status(job), "scheduled");
  });

  test("a job can only be completed once", async () => {
    let f = fixture();
    let job = makeJob(f.alice, f.mowing, "invoiced");

    loginAs(f.company);
    equal(await thrown(() => markComplete(job)), "This job is no longer scheduled.");
  });

  test("a completed job with no invoice can be billed", async () => {
    let f = fixture();
    let job = makeJob(f.alice, f.mowing, "completed");

    loginAs(f.company);
    sendInvoice(job);
    new InvoiceCustomerJob({ jobId: job }).run();
    equal(status(job), "invoiced");
  });

  test("an unpaid invoice is never marked paid from any other state", async () => {
    let f = fixture();
    let job = makeJob(f.alice, f.mowing);

    markPaid(job, "cs_test_x");
    equal(status(job), "scheduled");
  });
});

test("job comments", async () => {
  test("the customer posts as themselves, whatever the browser sent", async () => {
    let f = fixture();
    let job = makeJob(f.alice, f.mowing);

    loginAs(f.alice);
    comments.view({ jobId: job }).insert({ body: "  gate code 1234  ", authorName: "Someone Else", authorRole: "company" });

    let row = sql<{ body: string; authorName: string; authorRole: string }>(`
      select body, authorName, authorRole from comments where jobId = ${job}
    `).firstOrThrow();

    equal(row.body, "gate code 1234");
    equal(row.authorName, "Alice");
    equal(row.authorRole, "customer");
  });

  test("another customer can't post on the job", async () => {
    let f = fixture();
    let job = makeJob(f.alice, f.mowing);

    loginAs(f.bob);
    equal(await thrown(() => comments.view({ jobId: job }).insert({ body: "hi" })), "Job not found.");
  });

  test("an anonymous visitor can't post", async () => {
    let f = fixture();
    let job = makeJob(f.alice, f.mowing);

    assert(await thrown(() => comments.view({ jobId: job }).insert({ body: "hi" })) !== "");
  });

  test("the notification job runs for a company reply", async () => {
    let f = fixture();
    let job = makeJob(f.alice, f.mowing);

    loginAs(f.company);
    let row = comments.view({ jobId: job }).insert({ body: "On our way." });
    session.logout();

    equal(await thrown(() => new NotifyCommentJob({ commentId: row.id }).run()), "");
  });
});
