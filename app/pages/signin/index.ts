import { Request, Response, redirect, session } from "@elements/app";
import { homeFor } from "#app/shared/services/auth";
import html from "./template";

/** Only same-site paths, so a crafted link can't bounce someone off-site. */
export function safeNext(value: unknown): string {
  let next = typeof value === "string" ? value : "";

  return next.startsWith("/") && !next.startsWith("//") ? next : "";
}

export default function route(req: Request, res: Response) {
  let next = safeNext(req.query.next);

  if (session.isLoggedIn()) {
    redirect(next || homeFor(session.get("role")));
    return;
  }

  return new html({ next });
}
