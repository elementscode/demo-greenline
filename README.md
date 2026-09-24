# Greenline

> A demo app built with [Elements](https://elements.dev).

Customer booking, a crew job queue, comment threads that update live, invoices by email, and card payments.

**Demo:** [Greenline](https://elements.dev/demos/01a0d596-ae17-7da9-adaa-b3bbfdf1185d)

## Get started

```bash
elements create greenline -scaffold=elementscode/demo-greenline
```

## The prompt

```text
Build a job management web app for a lawn care business.

Two kinds of accounts: company and customer. Any company user can do all company
actions. Customers only see their own jobs.

CUSTOMER
- Sign up, log in.
- Book a job: pick a service, pick a date and time, describe the work.
  Business hours are weekdays 9am to 5pm.
- See their jobs.
- Open a job to see details and a comment thread they can post to.
- Pay the invoice with a credit card when the job is done.

COMPANY
- Log in.
- Queue view: all scheduled jobs, soonest first.
- Completed view: completed jobs, showing which ones have been paid.
- Job detail: customer, address, service, scheduled time, description, comment thread,
  and a Mark Complete button.
- Marking a job complete invoices the customer at the service's fixed price and emails
  them a payment link.

Send email when an invoice is ready and when someone posts a new comment.

Job status: scheduled, completed, invoiced, paid.

Seed one company user, two customers, three services (mowing, leaf cleanup, hedge
trimming), four jobs across statuses.

All status changes updated in real time.
```

## License

MIT. See [LICENSE](LICENSE).
