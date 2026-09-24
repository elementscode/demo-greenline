import { Request, Response, redirect, session } from "@elements/app";
import { jobs } from "#app/shared/services/jobs";
import html from "./template";

function board(tab: "queue" | "completed") {
  return function route(req: Request, res: Response) {
    if (!session.isLoggedIn()) {
      redirect(`/signin?next=/${tab}`);
      return;
    }

    if (session.get("role") !== "company") {
      redirect("/jobs");
      return;
    }

    return new html({ tab, jobs: jobs.view() });
  };
}

export const queue = board("queue");
export const completed = board("completed");
