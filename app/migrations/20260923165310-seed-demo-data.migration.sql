-- seed demo data
--
-- Demo accounts, all with the password "greenline1". Remove this file before
-- the first production deploy.

do $$
declare
  tz text := 'America/Chicago';
  today date := (now() at time zone 'America/Chicago')::date;
  company uuid;
  maria uuid;
  dev uuid;
  mowing uuid;
  leaves uuid;
  hedges uuid;
  nextDay date;
  pastDay date;
  olderDay date;
  oldestDay date;
begin
  insert into users (email, name, passwordHash, role)
       values ('crew@greenline.test', 'Greenline Crew', crypt('greenline1', genSalt('bf', 12)), 'company')
    returning id into company;

  insert into users (email, name, address, passwordHash, role)
       values ('maria@example.com', 'Maria Alvarez', '412 Elm Street, Evanston, IL', crypt('greenline1', genSalt('bf', 12)), 'customer')
    returning id into maria;

  insert into users (email, name, address, passwordHash, role)
       values ('dev@example.com', 'Dev Patel', '88 Maple Avenue, Oak Park, IL', crypt('greenline1', genSalt('bf', 12)), 'customer')
    returning id into dev;

  insert into services (name, blurb, priceCents, durationMinutes)
       values ('Mowing', 'Mow, edge and blow clippings off walks and drives.', 6500, 60)
    returning id into mowing;

  insert into services (name, blurb, priceCents, durationMinutes)
       values ('Leaf cleanup', 'Rake, blow and haul away leaves from lawn and beds.', 18000, 180)
    returning id into leaves;

  insert into services (name, blurb, priceCents, durationMinutes)
       values ('Hedge trimming', 'Shape and trim hedges and shrubs, clippings removed.', 12000, 120)
    returning id into hedges;

  -- The nearest weekdays either side of today, so the demo always has a job
  -- coming up and a history behind it.
  nextDay := today + 1;
  while extract(isodow from nextDay) > 5 loop
    nextDay := nextDay + 1;
  end loop;

  pastDay := today - 1;
  while extract(isodow from pastDay) > 5 loop
    pastDay := pastDay - 1;
  end loop;

  olderDay := pastDay - 2;
  while extract(isodow from olderDay) > 5 loop
    olderDay := olderDay - 1;
  end loop;

  oldestDay := olderDay - 5;
  while extract(isodow from oldestDay) > 5 loop
    oldestDay := oldestDay - 1;
  end loop;

  insert into jobs (customerId, serviceId, scheduledAt, description, address, status)
       values (maria, mowing, (nextDay + time '10:00') at time zone tz,
               'Front and back lawn. The side gate code is 1234. Please mind the new tulip bed by the porch.',
               '412 Elm Street, Evanston, IL', 'scheduled');

  insert into jobs (customerId, serviceId, scheduledAt, description, address, status, completedAt)
       values (dev, hedges, (pastDay + time '13:00') at time zone tz,
               'Boxwood hedge along the driveway, roughly 40 feet. Keep it about waist height.',
               '88 Maple Avenue, Oak Park, IL', 'completed', (pastDay + time '15:10') at time zone tz);

  insert into jobs (customerId, serviceId, scheduledAt, description, address, status, amountCents, completedAt, invoicedAt)
       values (maria, leaves, (olderDay + time '09:00') at time zone tz,
               'Big oak dropped everything at once. Beds along the fence need clearing too.',
               '412 Elm Street, Evanston, IL', 'invoiced', 18000,
               (olderDay + time '12:05') at time zone tz, (olderDay + time '12:06') at time zone tz);

  insert into jobs (customerId, serviceId, scheduledAt, description, address, status, amountCents, completedAt, invoicedAt, paidAt)
       values (dev, mowing, (oldestDay + time '11:00') at time zone tz,
               'Regular mow. Back yard only this week.',
               '88 Maple Avenue, Oak Park, IL', 'paid', 6500,
               (oldestDay + time '11:50') at time zone tz, (oldestDay + time '11:51') at time zone tz,
               (oldestDay + time '18:30') at time zone tz);

  insert into comments (jobId, authorId, authorName, authorRole, body, createdAt)
  select j.id, maria, 'Maria Alvarez', 'customer', 'Could you also bag the leaves by the garage? Happy to leave the bin out.', j.scheduledAt - interval '1 day'
    from jobs j where j.status = 'invoiced';

  insert into comments (jobId, authorId, authorName, authorRole, body, createdAt)
  select j.id, company, 'Greenline Crew', 'company', 'No problem, we will take care of those too.', j.scheduledAt - interval '20 hours'
    from jobs j where j.status = 'invoiced';
end;
$$;
