import { session, sql } from "@elements/app";
import { JobStatus } from "#app/shared/format";

export interface Fixture {
  company: string;
  alice: string;
  bob: string;
  mowing: string;
  hedges: string;
}

let counter = 0;

function user(name: string, role: "customer" | "company"): string {
  counter += 1;

  return sql<{ id: string }>(`
    insert into users (email, name, address, passwordHash, role)
         values (${`${name.toLowerCase()}-${counter}@test.local`}, ${name}, '1 Test Lane', crypt('password1', genSalt('bf', 4)), ${role})
      returning id
  `).firstOrThrow().id;
}

function service(name: string, priceCents: number, durationMinutes: number): string {
  counter += 1;

  return sql<{ id: string }>(`
    insert into services (name, priceCents, durationMinutes)
         values (${`${name} ${counter}`}, ${priceCents}, ${durationMinutes})
      returning id
  `).firstOrThrow().id;
}

export function fixture(): Fixture {
  return {
    company: user("Crew", "company"),
    alice: user("Alice", "customer"),
    bob: user("Bob", "customer"),
    mowing: service("Mowing", 6500, 60),
    hedges: service("Hedges", 12000, 120),
  };
}

export function makeJob(customerId: string, serviceId: string, status: JobStatus = "scheduled"): string {
  return sql<{ id: string }>(`
    insert into jobs (customerId, serviceId, scheduledAt, address, status)
         values (${customerId}, ${serviceId}, now() + interval '3 days', '1 Test Lane', ${status})
      returning id
  `).firstOrThrow().id;
}

export function loginAs(userId: string) {
  let u = sql<{ name: string; role: "customer" | "company" }>(`select name, role from users where id = ${userId}`).firstOrThrow();

  session.login({ userId, userName: u.name, role: u.role });
}

/** The next Monday through Friday at least two days out, as YYYY-MM-DD. */
export function futureWeekday(): string {
  let d = new Date();
  d.setUTCDate(d.getUTCDate() + 2);

  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) {
    d.setUTCDate(d.getUTCDate() + 1);
  }

  return d.toISOString().slice(0, 10);
}

export function futureSaturday(): string {
  let d = new Date();
  d.setUTCDate(d.getUTCDate() + 2);

  while (d.getUTCDay() !== 6) {
    d.setUTCDate(d.getUTCDate() + 1);
  }

  return d.toISOString().slice(0, 10);
}

/** Runs fn and returns the message it threw, or "" if it didn't throw. */
export async function thrown(fn: () => unknown): Promise<string> {
  try {
    await fn();
  } catch (err: any) {
    return err.message ?? String(err);
  }

  return "";
}
