import { Request, Response, redirect, session } from "@elements/app";
import { homeFor } from "#app/shared/services/auth";
import html from "./template";

export default function route(req: Request, res: Response) {
  if (session.isLoggedIn()) {
    redirect(homeFor(session.get("role")));
    return;
  }

  return new html();
}
