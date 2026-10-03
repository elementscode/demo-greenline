import { Request, Response, redirect, session } from "@elements/app";
import { homeFor } from "#app/shared/services/auth";

export default function route(req: Request, res: Response) {
  if (!session.isLoggedIn()) {
    redirect("/signin");
    return;
  }

  redirect(homeFor(session.get("role")));
}
