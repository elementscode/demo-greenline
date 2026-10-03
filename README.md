![Greenline, a lawn care job management app built with Elements: a completed leaf cleanup job awaiting payment, with its details, a live comment thread and a progress timeline.](https://elements.dev/demos/01a0d596-ae17-7da9-adaa-b3bbfdf1185d/poster?v=66e44c607751)

# Greenline

> A demo app built with [Elements](https://elements.dev).

Customer booking, a crew job queue, comment threads that update live, invoices by email, and card payments.

**Demo:** [Greenline](https://elements.dev/demos/01a0d596-ae17-7da9-adaa-b3bbfdf1185d)

## Agent specs

- **Agent:** Claude Code, Opus 5.5 Medium
- **Time:** 14 min
- **Cost:** $6.64 at API rates, September 2026

## Get started

```bash
elements create greenline -scaffold=elementscode/demo-greenline
```

## How it's built

Greenline needed customer booking, a crew queue that stays current, comment threads on each job, invoices by email when work is done, and card payments that mark a job paid. Each of those is a part of Elements, so the agent spent its 14 minutes on the lawn care business itself.

### What Elements gave the app

- **Live jobs.** Jobs are a LiveTable that the crew's queue, each customer's list and each job page all watch. Bookings, completions and payments reach every open page as they happen, so a new booking lands in the crew's queue and a payment shows on the customer's page live.

- **Live comment threads.** Comments are a LiveTable opened per job. A comment appears for the crew and the customer at once, carries its author from the session, and schedules an email to the other side.

- **Booking and crew actions as function calls.** The booking form and the crew's complete and invoice buttons call `@rpc` functions, with types checked from the page to the database.

- **Invoices from background jobs.** Completing a job schedules its invoice in the same transaction, so every finished job has its invoice on the way. The job prices it from the service and emails the customer a payment link.

- **Card payments.** Checkout charges exactly what the invoice says. The return page and the webhook both mark the job paid, and the payment is recorded once, whichever arrives first.

- **Data from SQL files.** Two migrations define the business and seed a crew account, two customers, three services, and jobs in every status from scheduled to paid, with comment threads.

### What the project server gave the agent

The project server runs alongside the agent and answers as soon as a file is saved: it type-checks the templates, TypeScript and SQL, applies migrations and reruns the tests, so every question came back right away and the agent kept building.

### What shipped

The app type-checks with zero errors and all 24 tests pass. Every page works on desktop and phone, and live updates arrive across tabs, such as a new booking in the crew's queue and a comment on a job.

**Demo:** [Greenline](https://elements.dev/demos/01a0d596-ae17-7da9-adaa-b3bbfdf1185d)

## Payments

Without a Stripe key, invoices are paid through the built-in test checkout: the Pay button opens a page in the app that shows the invoice and records the payment the same way a real one is recorded, so the paid status and live updates all work. No card is charged.

For real Stripe Checkout, create a free sandbox at [dashboard.stripe.com/register](https://dashboard.stripe.com/register), copy the secret key from Developers, API keys, and add it to `config/env/development.env`:

```text
STRIPE_SECRET_KEY=<your sandbox secret key>
```

Production requires the key: the build fails without it and the app refuses to start with it empty. In production the app registers its own Stripe webhook endpoint the first time a customer starts a checkout, so there is nothing else to set up.

## License

MIT. See [LICENSE](LICENSE).
