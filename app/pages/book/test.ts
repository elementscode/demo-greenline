import { test, assert, equal, sql } from "@elements/app";
import { bookJob } from "./services";
import { startTimes } from "#app/shared/format";
import { fixture, loginAs, futureWeekday, futureSaturday, thrown } from "#app/shared/testing/fixtures";

async function fieldError(fn: () => unknown, field: string): Promise<string> {
  try {
    await fn();
  } catch (err: any) {
    return err.errors?.[field]?.[0] ?? err.message;
  }

  return "";
}

test("book", async () => {
  test("start times stay inside business hours", async () => {
    equal(startTimes(60)[0], "09:00");
    equal(startTimes(60).at(-1), "16:00");
    equal(startTimes(120).at(-1), "15:00");
    equal(startTimes(180).at(-1), "14:00");
  });

  test("books a weekday job at the customer's address", async () => {
    let f = fixture();
    loginAs(f.alice);

    let id = bookJob({ serviceId: f.mowing, date: futureWeekday(), time: "10:30", description: "  back yard  " });
    let job = sql<{ status: string; description: string; address: string; customerId: string }>(`
      select status, description, address, customerId from jobs where id = ${id}
    `).firstOrThrow();

    equal(job.status, "scheduled");
    equal(job.description, "back yard");
    equal(job.address, "1 Test Lane");
    equal(job.customerId, f.alice);
  });

  test("refuses weekends", async () => {
    let f = fixture();
    loginAs(f.alice);

    let message = await fieldError(() => bookJob({ serviceId: f.mowing, date: futureSaturday(), time: "10:00", description: "" }), "date");
    assert(message.includes("weekdays"), message);
  });

  test("refuses a start that would run past closing", async () => {
    let f = fixture();
    loginAs(f.alice);

    let message = await fieldError(() => bookJob({ serviceId: f.hedges, date: futureWeekday(), time: "16:00", description: "" }), "time");
    assert(message.includes("between"), message);

    message = await fieldError(() => bookJob({ serviceId: f.mowing, date: futureWeekday(), time: "08:00", description: "" }), "time");
    assert(message.includes("between"), message);
  });

  test("refuses a time in the past", async () => {
    let f = fixture();
    loginAs(f.alice);

    let message = await fieldError(() => bookJob({ serviceId: f.mowing, date: "2020-06-01", time: "10:00", description: "" }), "date");
    assert(message.includes("passed"), message);
  });

  test("is for customers only", async () => {
    let f = fixture();
    loginAs(f.company);

    equal(await thrown(() => bookJob({ serviceId: f.mowing, date: futureWeekday(), time: "10:00", description: "" })), "Customer account required.");
  });
});
