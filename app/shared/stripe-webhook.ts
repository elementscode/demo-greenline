import { checkoutDb, getAppUrl, getEnv, sql } from "@elements/app";
import config from "#config";
import { stripe } from "#app/shared/stripe";

const EVENTS = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
] as const;

const DESCRIPTION = "Registered by Greenline";

let ensured = "";

function webhookUrl(): string {
  return `${getAppUrl()}/stripe/webhook`;
}

/**
 * Makes sure Stripe has an endpoint for this app's url, once per process.
 * A Postgres advisory lock keeps two machines from registering at once.
 */
export async function ensureWebhook(): Promise<void> {
  let url = webhookUrl();

  if (getEnv() !== "production" || ensured === url) {
    return;
  }

  using db = checkoutDb();
  db.sql(`select pg_advisory_lock(hashtext('stripe-webhook'))`);

  try {
    let saved = db.sql<{ url: string }>(`
      select url
      from stripeWebhooks
      where url = ${url}
    `).first();

    if (!saved) {
      // An endpoint at this url with no saved secret is left over from a
      // reset database. Its secret is gone, so replace it.
      let existing = await stripe().webhookEndpoints.list({ limit: 100 });

      for (let old of existing.data) {
        if (old.url === url && old.description === DESCRIPTION) {
          await stripe().webhookEndpoints.del(old.id);
        }
      }

      let endpoint = await stripe().webhookEndpoints.create({
        url,
        enabled_events: [...EVENTS],
        description: DESCRIPTION,
      });

      db.sql(`
        insert into stripeWebhooks (
          url,
          endpointId,
          secret
        ) values (
          ${url},
          ${endpoint.id},
          ${endpoint.secret!}
        )
      `);
    }

    ensured = url;
  } finally {
    db.sql(`select pg_advisory_unlock(hashtext('stripe-webhook'))`);
  }
}

export function webhookSecret(): string {
  if (getEnv() !== "production") {
    return config.stripe.webhookSecret;
  }

  return sql<{ secret: string }>(`
    select secret
    from stripeWebhooks
    where url = ${webhookUrl()}
  `).first()?.secret ?? "";
}
