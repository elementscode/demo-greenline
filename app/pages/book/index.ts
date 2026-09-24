import { Request, Response, redirect, session } from "@elements/app";
import config from "#config";
import { listServices } from "./services";
import html from "./template";

/** The first weekday after today in the business's zone, as YYYY-MM-DD. */
function firstOpenDay(): { today: string; first: string } {
  let today = new Intl.DateTimeFormat("en-CA", { timeZone: config.public.timeZone }).format(new Date());
  let d = new Date(`${today}T00:00:00Z`);

  do {
    d.setUTCDate(d.getUTCDate() + 1);
  } while (d.getUTCDay() === 0 || d.getUTCDay() === 6);

  return { today, first: d.toISOString().slice(0, 10) };
}

export default function route(req: Request, res: Response) {
  if (!session.isLoggedIn()) {
    redirect("/signin?next=/book");
    return;
  }

  if (session.get("role") !== "customer") {
    redirect("/queue");
    return;
  }

  let services = listServices();
  let { today, first } = firstOpenDay();
  let requested = services.find((s) => s.name.toLowerCase().replace(/\s+/g, "-") === req.query.service);

  return new html({ services, today, first, serviceId: (requested ?? services[0]).id });
}
