import { LiveTable, ForbiddenError, NotFoundError, session, sql } from "@elements/app";
import { JobStatus } from "#app/shared/format";

export interface Job {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  address: string;
  serviceId: string;
  serviceName: string;
  priceCents: number;
  amountCents: number | null;
  scheduledAt: Date;
  description: string;
  status: JobStatus;
  createdAt: Date;
  completedAt: Date | null;
  invoicedAt: Date | null;
  paidAt: Date | null;
}

function readOnly(): never {
  throw new ForbiddenError("Jobs change through their actions, not direct edits.");
}

/**
 * Every write to jobs goes through an rpc, a job worker or the Stripe webhook,
 * and a trigger in the migration broadcasts each one on these channels. So the
 * browser only ever reads through a view.
 */
export let jobs: LiveTable<Job> = new LiveTable<Job>({
  channel: (partition) => (partition ? `jobs:${partition}` : "jobs"),

  select: (partition: Partial<Job>) => {
    if (partition.id) {
      return sql<Job>(`select * from jobRows where id = ${partition.id}`);
    }

    if (partition.customerId) {
      return sql<Job>(`select * from jobRows where customerId = ${partition.customerId}`);
    }

    return sql<Job>(`select * from jobRows`);
  },

  insert: readOnly,
  update: readOnly,
  delete: readOnly,
});

export function findJob(jobId: string): Job | undefined {
  if (!/^[0-9a-f-]{36}$/i.test(jobId)) {
    return undefined;
  }

  return sql<Job>(`select * from jobRows where id = ${jobId}`).first();
}

/** The job, if the signed-in user may see it: any company user, or its customer. */
export function authorizeJob(jobId: string): Job {
  session.isLoggedInOrThrow();

  let job = findJob(jobId);

  if (!job) {
    throw new NotFoundError("Job not found.");
  }

  if (session.get("role") !== "company" && job.customerId !== session.get("userId")) {
    throw new NotFoundError("Job not found.");
  }

  return job;
}
