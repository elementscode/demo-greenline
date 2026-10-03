import { Request, Response } from "@elements/app";
import { stripe } from "#app/shared/stripe";
import { webhookSecret } from "#app/shared/stripe-webhook";
import { fulfillCheckout } from "#app/shared/services/payments";

/** The backstop for a customer who pays and closes the tab before the return. */
export default async function route(req: Request, res: Response) {
  let event;

  try {
    event = stripe().webhooks.constructEvent(
      req.bodyBuffer!,
      req.headers["stripe-signature"] as string,
      webhookSecret(),
    );
  } catch {
    res.status(400).send("invalid signature");
    return;
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      await fulfillCheckout(event.data.object.id);
      break;
  }

  return "ok";
}
