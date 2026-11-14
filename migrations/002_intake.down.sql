DROP SCHEMA traceability CASCADE;
DROP SCHEMA intake CASCADE;
DROP TABLE access.center_grants;
DROP TABLE access.centers;
ALTER TABLE harvest.pre_lots DROP CONSTRAINT pre_lots_id_org_unique;
