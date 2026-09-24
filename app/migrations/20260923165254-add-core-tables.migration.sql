-- add core tables

-- Auto-update updatedAt on row changes.
create or replace function touchUpdatedAt()
returns trigger
language plpgsql
as $$
begin
  new.updatedAt = now();
  return new;
end;
$$;

create type userRole as enum ('customer', 'company');

create type jobStatus as enum ('scheduled', 'completed', 'invoiced', 'paid');

create table users (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  email text not null unique,
  name text not null,
  address text not null default '',
  passwordHash text not null,
  role userRole not null default 'customer'
);

create trigger usersTouchUpdatedAt
  before update on users
  for each row execute function touchUpdatedAt();

create table services (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  name text not null unique,
  blurb text not null default '',
  priceCents integer not null check (priceCents > 0),
  durationMinutes integer not null check (durationMinutes > 0)
);

create trigger servicesTouchUpdatedAt
  before update on services
  for each row execute function touchUpdatedAt();

create table jobs (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  customerId uuid not null references users (id),
  serviceId uuid not null references services (id),
  scheduledAt timestamptz not null,
  description text not null default '',
  address text not null default '',
  status jobStatus not null default 'scheduled',
  -- Captured at invoice time so a later price change never rewrites a bill.
  amountCents integer,
  completedAt timestamptz,
  invoicedAt timestamptz,
  paidAt timestamptz,
  stripeSessionId text unique
);

create index jobsCustomerIdIdx on jobs (customerId);
create index jobsStatusScheduledAtIdx on jobs (status, scheduledAt);

create trigger jobsTouchUpdatedAt
  before update on jobs
  for each row execute function touchUpdatedAt();

create table comments (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  jobId uuid not null references jobs (id),
  authorId uuid not null references users (id),
  authorName text not null,
  authorRole userRole not null,
  body text not null check (length(body) between 1 and 4000)
);

create index commentsJobIdIdx on comments (jobId);

create trigger commentsTouchUpdatedAt
  before update on comments
  for each row execute function touchUpdatedAt();

-- A Date crosses the wire as { $type: "Date", $value: <ms> }.
create or replace function liveDate(t timestamptz)
returns json
language sql
immutable
as $$
  select case
    when t is null then null
    else json_build_object('$type', 'Date', '$value', (extract(epoch from t) * 1000)::bigint)
  end;
$$;

-- The row the jobs LiveTable holds, built the same way its select builds it.
create or replace function jobLiveRow(jobId uuid)
returns json
language sql
stable
as $$
  select json_build_object(
    'id', j.id,
    'customerId', j.customerId,
    'customerName', u.name,
    'customerEmail', u.email,
    'address', j.address,
    'serviceId', j.serviceId,
    'serviceName', s.name,
    'priceCents', s.priceCents,
    'amountCents', j.amountCents,
    'scheduledAt', liveDate(j.scheduledAt),
    'description', j.description,
    'status', j.status,
    'createdAt', liveDate(j.createdAt),
    'completedAt', liveDate(j.completedAt),
    'invoicedAt', liveDate(j.invoicedAt),
    'paidAt', liveDate(j.paidAt)
  )
  from jobs j
  join users u on u.id = j.customerId
  join services s on s.id = j.serviceId
  where j.id = jobId;
$$;

-- Every write to jobs, from an rpc, a job worker, the Stripe webhook or psql,
-- reaches every page watching it: the whole queue, one customer's list, and
-- one job's detail page.
create or replace function jobsNotify()
returns trigger
language plpgsql
as $$
declare
  r record;
  payload text;
begin
  r := coalesce(new, old);

  if tg_op = 'DELETE' then
    payload := json_build_object('op', 'delete', 'data', json_build_object('id', r.id))::text;
  else
    payload := json_build_object('op', lower(tg_op), 'data', jobLiveRow(r.id))::text;
  end if;

  perform pg_notify(channel_name('jobs'), payload);
  perform pg_notify(channel_name('jobs:customerId=' || r.customerId), payload);
  perform pg_notify(channel_name('jobs:id=' || r.id), payload);

  return r;
end;
$$;

create trigger jobsNotifyTrigger
  after insert or update or delete on jobs
  for each row execute function jobsNotify();

-- The shape every page reads a job in: the job with its customer and service.
create view jobRows as
  select j.id,
         j.customerId,
         u.name as customerName,
         u.email as customerEmail,
         j.address,
         j.serviceId,
         s.name as serviceName,
         s.priceCents,
         j.amountCents,
         j.scheduledAt,
         j.description,
         j.status,
         j.createdAt,
         j.completedAt,
         j.invoicedAt,
         j.paidAt
    from jobs j
    join users u on u.id = j.customerId
    join services s on s.id = j.serviceId;
