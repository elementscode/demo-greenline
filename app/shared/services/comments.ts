import { LiveTable, ForbiddenError, ValidationError, session, sql } from "@elements/app";
import { authorizeJob } from "#app/shared/services/jobs";
import { NotifyCommentJob } from "#app/jobs/notify-comment";

export const MAX_COMMENT = 4000;

export interface Comment {
  id: string;
  jobId: string;
  authorId: string;
  authorName: string;
  authorRole: "customer" | "company";
  body: string;
  createdAt: Date;
}

export let comments: LiveTable<Comment> = new LiveTable<Comment>({
  insert: (item) => {
    let job = authorizeJob(item.jobId ?? "");
    let body = (item.body ?? "").trim();

    if (!body) {
      throw new ValidationError("Write a comment first.");
    }

    if (body.length > MAX_COMMENT) {
      throw new ValidationError(`Keep comments under ${MAX_COMMENT} characters.`);
    }

    // Author fields come from the session, never from what the browser sent.
    let row = sql<Comment>(`
      insert into comments (id, jobId, authorId, authorName, authorRole, body)
           values (${item.id}, ${job.id}, ${session.getOrThrow("userId")}, ${session.getOrThrow("userName")}, ${session.getOrThrow("role")}, ${body})
        returning *
    `).firstOrThrow();

    new NotifyCommentJob({ commentId: row.id }).schedule();

    return row;
  },

  update: () => {
    throw new ForbiddenError("Comments can't be edited.");
  },

  delete: () => {
    throw new ForbiddenError("Comments can't be deleted.");
  },
});
