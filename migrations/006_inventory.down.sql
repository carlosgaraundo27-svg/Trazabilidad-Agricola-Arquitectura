-- statement
DROP SCHEMA inventory CASCADE;
-- statement
DELETE FROM access.center_grants WHERE action LIKE 'inventory:%' OR action LIKE 'shipment:%';
-- statement
ALTER TABLE access.center_grants DROP CONSTRAINT center_grants_action_check;
-- statement
ALTER TABLE access.center_grants ADD CONSTRAINT center_grants_action_check CHECK(action IN ('intake:read','intake:receive','intake:review','intake:confirm','lot:consolidate','quality:read','quality:create','quality:update','quality:close','publication:read','publication:publish','publication:withdraw'));
