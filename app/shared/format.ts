import config from "#config";

export type JobStatus = "scheduled" | "completed" | "invoiced" | "paid";

const { timeZone } = config.public;

const whenFormat = new Intl.DateTimeFormat("en-US", {
  timeZone,
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const dayFormat = new Intl.DateTimeFormat("en-US", {
  timeZone,
  weekday: "long",
  month: "long",
  day: "numeric",
});

const timeFormat = new Intl.DateTimeFormat("en-US", {
  timeZone,
  hour: "numeric",
  minute: "2-digit",
});

const stampFormat = new Intl.DateTimeFormat("en-US", {
  timeZone,
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function money(cents: number | null | undefined): string {
  return `$${((cents ?? 0) / 100).toFixed(2)}`;
}

export function when(date: Date): string {
  return whenFormat.format(date);
}

export function day(date: Date): string {
  return dayFormat.format(date);
}

export function time(date: Date): string {
  return timeFormat.format(date);
}

export function stamp(date: Date): string {
  return stampFormat.format(date);
}

export function statusLabel(status: JobStatus): string {
  switch (status) {
    case "scheduled":
      return "Scheduled";

    case "completed":
      return "Completed";

    case "invoiced":
      return "Awaiting payment";

    case "paid":
      return "Paid";
  }
}

export function statusPill(status: JobStatus): string {
  switch (status) {
    case "scheduled":
      return "pill is-info";

    case "completed":
      return "pill is-warning";

    case "invoiced":
      return "pill is-warning";

    case "paid":
      return "pill is-success";
  }
}

/** "09:00" through the last start that still finishes by closing time. */
export function startTimes(durationMinutes: number): string[] {
  let { openHour, closeHour } = config.public;
  let times: string[] = [];

  for (let minutes = openHour * 60; minutes + durationMinutes <= closeHour * 60; minutes += 30) {
    let h = Math.floor(minutes / 60);
    let m = minutes % 60;
    times.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }

  return times;
}

export function timeLabel(hhmm: string): string {
  let [h, m] = hhmm.split(":").map(Number);
  let suffix = h >= 12 ? "pm" : "am";
  let hour = h % 12 === 0 ? 12 : h % 12;

  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}
