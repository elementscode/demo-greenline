import { sql, ValidationError } from "@elements/app";
import config from "#config";
import { requireCustomer } from "#app/shared/services/auth";
import { startTimes } from "#app/shared/format";

export interface Service {
  id: string;
  name: string;
  blurb: string;
  priceCents: number;
  durationMinutes: number;
}

export interface BookingForm {
  serviceId: string;
  date: string;
  time: string;
  description: string;
}

export type BookingErrors = Partial<Record<keyof BookingForm, string[]>>;

export function listServices(): Service[] {
  return sql<Service>(`
    select id, name, blurb, priceCents, durationMinutes from services order by priceCents
  `).all();
}

/** 0 is Sunday. The date is a calendar day, so read it without a zone. */
export function weekday(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

/** @rpc */
export function bookJob(form: BookingForm): string {
  let customerId = requireCustomer();
  let errors: BookingErrors = {};

  let service = /^[0-9a-f-]{36}$/i.test(form.serviceId)
    ? sql<Service>(`select id, name, blurb, priceCents, durationMinutes from services where id = ${form.serviceId}`).first()
    : undefined;

  if (!service) {
    errors.serviceId = ["Pick a service."];
  }

  let validDate = /^\d{4}-\d{2}-\d{2}$/.test(form.date) && !Number.isNaN(Date.parse(form.date));

  if (!validDate) {
    errors.date = ["Pick a date."];
  } else if (weekday(form.date) === 0 || weekday(form.date) === 6) {
    errors.date = ["We work weekdays only. Pick Monday through Friday."];
  }

  if (service && !startTimes(service.durationMinutes).includes(form.time)) {
    errors.time = [`Pick a start time between ${config.public.openHour}am and ${config.public.closeHour - 12}pm.`];
  }

  if (form.description.length > 2000) {
    errors.description = ["Keep the description under 2000 characters."];
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError<BookingForm>(errors);
  }

  let job = sql<{ id: string; future: boolean }>(`
    with slot as (
      select (${form.date}::date + ${form.time}::time) at time zone ${config.public.timeZone} as at
    )
    insert into jobs (customerId, serviceId, scheduledAt, description, address)
    select ${customerId}, ${service!.id}, slot.at, ${form.description.trim()}, u.address
      from slot, users u
     where u.id = ${customerId}
       and slot.at > now()
    returning id
  `).first();

  if (!job) {
    throw new ValidationError<BookingForm>({ date: ["That time has already passed. Pick a later one."] });
  }

  return job.id;
}
