-- Solo bases desechables: nunca usar para corregir evaluaciones cerradas.
DROP SCHEMA quality CASCADE;
ALTER TABLE access.center_grants DROP CONSTRAINT center_grants_action_check;
DELETE FROM access.center_grants WHERE action LIKE 'quality:%';
ALTER TABLE access.center_grants ADD CONSTRAINT center_grants_action_check CHECK(action IN ('intake:read','intake:receive','intake:review','intake:confirm','lot:consolidate'));
