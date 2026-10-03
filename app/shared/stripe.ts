import Stripe from "stripe";
import { getEnv } from "@elements/app";
import config from "#config";

let client: Stripe | undefined;

/** @server */
export function stripeConfigured(): boolean {
  return config.stripe.secretKey !== "";
}

/**
 * True when payments go through the in-app test checkout instead of Stripe.
 * @server
 */
export function testCheckout(): boolean {
  return !stripeConfigured() && getEnv() !== "production";
}

/** @server */
export function stripe(): Stripe {
  client ??= new Stripe(config.stripe.secretKey);

  return client;
}
