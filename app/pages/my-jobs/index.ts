import { Request, Response, redirect, session } from "@elements/app";
import { jobs } from "#app/shared/services/jobs";
import html from "./template";

export default function route(req: Request, res: Response) {
  if (!session.isLoggedIn()) {
    redirect("/signin?next=/jobs");
    return;
  }

  if (session.get("role") !== "customer") {
    redirect("/queue");
    return;
  }

  return new html({ jobs: jobs.view({ customerId: session.getOrThrow("userId") }) });
}
