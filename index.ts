import { App, getEnv } from "@elements/app";
import config from "#config";
import home from "#app/pages/home";
import signin from "#app/pages/signin";
import signup from "#app/pages/signup";
import myJobs from "#app/pages/my-jobs";
import book from "#app/pages/book";
import job from "#app/pages/job";
import { queue, completed } from "#app/pages/board";
import jobPay from "#app/routes/job-pay";
import jobPaid from "#app/routes/job-paid";
import checkoutTest from "#app/pages/checkout-test";
import stripeWebhook from "#app/routes/stripe-webhook";
import notFound from "#app/pages/errors/not-found";
import unhandled from "#app/pages/errors/unhandled";
import { stripeConfigured } from "#app/shared/stripe";

// Production always takes real payments: no key, no start.
if (getEnv() === "production" && !stripeConfigured()) {
  throw new Error("STRIPE_SECRET_KEY is required in production.");
}

const app = new App();

app.route("/", home);
app.route("/signin", signin);
app.route("/signup", signup);
app.route("/jobs", myJobs);
app.route("/book", book);
app.route("/jobs/:id", job);
app.route("/jobs/:id/pay", jobPay);
app.route("/jobs/:id/paid", jobPaid);
app.route("/checkout/test/:jobId", checkoutTest);
app.route("/queue", queue);
app.route("/completed", completed);
app.route({ method: "post", path: "/stripe/webhook", handler: stripeWebhook });

app.error((req, res, err) => {
  switch (err.statusCode) {
    case 404:
      return notFound(req, res, err);

    default:
      return unhandled(req, res, err);
  }
});

app.start(config);
