import { Request, Response, redirect, session } from "@elements/app";
import { jobs, authorizeJob } from "#app/shared/services/jobs";
import { comments } from "#app/shared/services/comments";
import html from "./template";

export default function route(req: Request, res: Response) {
  if (!session.isLoggedIn()) {
    redirect(`/signin?next=${encodeURIComponent(req.url ?? "")}`);
    return;
  }

  let job = authorizeJob(req.params.id);

  return new html({
    jobId: job.id,
    jobs: jobs.view({ id: job.id }),
    comments: comments.view({ jobId: job.id }),
    notice: req.query.paid === "1" ? "paid" : req.query.paid === "0" ? "cancelled" : "",
  });
}
