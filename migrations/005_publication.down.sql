-- statement
DROP SCHEMA publication CASCADE;
-- statement
DELETE FROM access.center_grants WHERE action IN ('publication:read','publication:publish','publication:withdraw');
-- statement
ALTER TABLE access.center_grants DROP CONSTRAINT center_grants_action_check;
-- statement
DO $$ BEGIN
 IF to_regnamespace('quality') IS NULL THEN
  ALTER TABLE access.center_grants ADD CONSTRAINT center_grants_action_check CHECK(action IN ('intake:read','intake:receive','intake:review','intake:confirm','lot:consolidate'));
 ELSE
  ALTER TABLE access.center_grants ADD CONSTRAINT center_grants_action_check CHECK(action IN ('intake:read','intake:receive','intake:review','intake:confirm','lot:consolidate','quality:read','quality:create','quality:update','quality:close'));
 END IF;
END; $$;
