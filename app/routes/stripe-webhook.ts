import { Request, Response } from "@elements/app";
import config from "#config";
import { markPaid, stripe } from "#app/shared/services/payments";

export default function route(req: Request, res: Response) {
  let event;

  try {
    event = stripe().webhooks.constructEvent(
      req.bodyBuffer!,
      req.headers["stripe-signature"] as string,
      config.stripe.webhookSecret,
    );
  } catch {
    res.status(400).send("invalid signature");
    return;
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    let checkout = event.data.object;

    if (checkout.payment_status === "paid" && checkout.client_reference_id) {
      markPaid(checkout.client_reference_id, checkout.id);
    }
  }

  return "ok";
}
