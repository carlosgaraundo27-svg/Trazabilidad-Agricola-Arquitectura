-- statement
ALTER TABLE inventory.movements DROP CONSTRAINT inventory_movement_shipment_fk;
-- statement
ALTER TABLE inventory.events DROP CONSTRAINT inventory_event_shipment_fk;
-- statement
DROP TRIGGER logistics_movement_amount ON inventory.movements;
-- statement
DROP SCHEMA logistics CASCADE;
