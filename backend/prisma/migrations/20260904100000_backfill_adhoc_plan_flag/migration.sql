-- Ad-hoc PM plans were created with the three 'Ad-hoc' sentinel strings but
-- never had isAdhoc set, so every code path that filters on the flag — the
-- coverage-gap map and the dashboard's plan-vs-adhoc split — treated them as
-- ordinary plans. POST /pm/runs/adhoc now sets the flag and looks plans up by
-- it; without this backfill that lookup would miss the existing rows and
-- create a duplicate ad-hoc plan per device type.
UPDATE "pm_plans"
SET "isAdhoc" = true
WHERE "company" = 'Ad-hoc'
  AND "isAdhoc" = false;
