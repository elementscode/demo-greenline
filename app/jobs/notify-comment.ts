import { Job, email, sql } from "@elements/app";
import { findJob } from "#app/shared/services/jobs";
import { day } from "#app/shared/format";
import NewCommentEmail from "#app/emails/new-comment";

export interface NotifyCommentJobFields {
  commentId: string;
}

interface CommentRow {
  jobId: string;
  authorName: string;
  authorRole: "customer" | "company";
  body: string;
}

/** Emails the other side of the thread: the customer, or every company user. */
export class NotifyCommentJob extends Job<NotifyCommentJobFields> {
  static maxAttempts = 5;

  run() {
    let comment = sql<CommentRow>(`
      select jobId, authorName, authorRole, body from comments where id = ${this.fields.commentId}
    `).first();

    if (!comment) {
      return;
    }

    let job = findJob(comment.jobId);

    if (!job) {
      return;
    }

    let recipients = comment.authorRole === "customer"
      ? sql<{ email: string; name: string }>(`select email, name from users where role = 'company'`).all()
      : [{ email: job.customerEmail, name: job.customerName }];

    for (let recipient of recipients) {
      email({
        to: recipient.email,
        subject: `New comment on ${job.serviceName} (${day(job.scheduledAt)})`,
        body: new NewCommentEmail({
          recipientName: recipient.name,
          authorName: comment.authorName,
          serviceName: job.serviceName,
          when: day(job.scheduledAt),
          body: comment.body,
          jobUrl: `/jobs/${job.id}`,
        }),
      });
    }
  }
}
