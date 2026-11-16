-- statement
CREATE SCHEMA logistics;
-- statement
CREATE TABLE logistics.shipments(
 id uuid PRIMARY KEY, entry_id uuid NOT NULL, organization_id uuid NOT NULL, center_id uuid NOT NULL,
 quantity_kg numeric(15,3) NOT NULL CHECK(quantity_kg>0), state text NOT NULL DEFAULT 'draft' CHECK(state IN ('draft','reserved','in_transit','delivered','cancelled')),
 version integer NOT NULL DEFAULT 1 CHECK(version>0), transport jsonb NOT NULL CHECK(jsonb_typeof(transport)='object' AND transport ?& ARRAY['guideReference','vehicleLabel','plate','driverName','sealReference']), destination_label varchar(120),
 guide_reference text GENERATED ALWAYS AS (transport->>'guideReference') STORED,
 departed_at timestamptz(3), created_by uuid NOT NULL, created_at timestamptz(3) NOT NULL DEFAULT date_trunc('milliseconds',clock_timestamp()), updated_by uuid NOT NULL, updated_at timestamptz(3) NOT NULL DEFAULT date_trunc('milliseconds',clock_timestamp()),
 CHECK(guide_reference IS NULL OR (guide_reference=upper(trim(guide_reference)) AND length(guide_reference) BETWEEN 1 AND 120)),
 CHECK((state IN ('in_transit','delivered') AND departed_at IS NOT NULL AND departed_at>=created_at) OR (state IN ('draft','reserved','cancelled') AND departed_at IS NULL)),
 CHECK(state NOT IN ('in_transit','delivered') OR (length(trim(destination_label))>0 AND destination_label IS NOT NULL AND
  transport->>'guideReference' IS NOT NULL AND length(trim(transport->>'guideReference'))>0 AND transport->>'vehicleLabel' IS NOT NULL AND length(trim(transport->>'vehicleLabel'))>0 AND transport->>'plate' IS NOT NULL AND length(trim(transport->>'plate'))>0 AND transport->>'driverName' IS NOT NULL AND length(trim(transport->>'driverName'))>0 AND transport->>'sealReference' IS NOT NULL AND length(trim(transport->>'sealReference'))>0)),
 UNIQUE(id,entry_id,organization_id,center_id), UNIQUE(organization_id,center_id,guide_reference),
 FOREIGN KEY(entry_id,organization_id,center_id) REFERENCES inventory.entries(id,organization_id,center_id),
 FOREIGN KEY(created_by,organization_id) REFERENCES access.users(id,organization_id), FOREIGN KEY(updated_by,organization_id) REFERENCES access.users(id,organization_id)
);
-- statement
CREATE UNIQUE INDEX logistics_one_active_shipment ON logistics.shipments(entry_id) WHERE state IN ('reserved','in_transit','delivered');
-- statement
CREATE INDEX logistics_shipments_center ON logistics.shipments(organization_id,center_id,id);
-- statement
CREATE TABLE logistics.deliveries(
 shipment_id uuid PRIMARY KEY, entry_id uuid NOT NULL, organization_id uuid NOT NULL, center_id uuid NOT NULL,
 received_kg numeric(15,3) NOT NULL CHECK(received_kg>0), delivered_at timestamptz(3) NOT NULL, evidence_ref varchar(500) NOT NULL CHECK(length(trim(evidence_ref))>0),
 actor_id uuid NOT NULL, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 FOREIGN KEY(shipment_id,entry_id,organization_id,center_id) REFERENCES logistics.shipments(id,entry_id,organization_id,center_id),
 FOREIGN KEY(actor_id,organization_id) REFERENCES access.users(id,organization_id)
);
-- statement
ALTER TABLE inventory.movements ADD CONSTRAINT inventory_movement_shipment_fk FOREIGN KEY(shipment_id,entry_id,organization_id,center_id) REFERENCES logistics.shipments(id,entry_id,organization_id,center_id);
-- statement
ALTER TABLE inventory.events ADD CONSTRAINT inventory_event_shipment_fk FOREIGN KEY(shipment_id,entry_id,organization_id,center_id) REFERENCES logistics.shipments(id,entry_id,organization_id,center_id);
-- statement
CREATE FUNCTION logistics.guard_shipment() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'shipment cannot be deleted' USING ERRCODE='23514'; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.state<>'draft' OR NEW.version<>1 OR NEW.quantity_kg IS DISTINCT FROM (SELECT admitted_kg FROM inventory.entries WHERE id=NEW.entry_id AND organization_id=NEW.organization_id AND center_id=NEW.center_id) THEN RAISE EXCEPTION 'whole admitted lot required' USING ERRCODE='23514'; END IF;
 ELSE
  IF (to_jsonb(NEW)-ARRAY['state','version','transport','destination_label','departed_at','updated_by','updated_at','guide_reference']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['state','version','transport','destination_label','departed_at','updated_by','updated_at','guide_reference']) OR NEW.version<>OLD.version+1 THEN RAISE EXCEPTION 'shipment identity immutable, version must advance' USING ERRCODE='23514'; END IF;
  IF OLD.state IN ('delivered','cancelled') OR (OLD.state='in_transit' AND (NEW.state<>'delivered' OR NEW.transport IS DISTINCT FROM OLD.transport OR NEW.destination_label IS DISTINCT FROM OLD.destination_label OR NEW.departed_at IS DISTINCT FROM OLD.departed_at)) OR (OLD.state='reserved' AND NEW.state NOT IN ('reserved','in_transit','cancelled')) OR (OLD.state='draft' AND NEW.state NOT IN ('draft','reserved','cancelled')) THEN RAISE EXCEPTION 'invalid shipment transition' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW;
END;
$$;
-- statement
CREATE TRIGGER logistics_shipment_guard BEFORE INSERT OR UPDATE OR DELETE ON logistics.shipments FOR EACH ROW EXECUTE FUNCTION logistics.guard_shipment();
-- statement
CREATE TRIGGER logistics_shipment_no_truncate BEFORE TRUNCATE ON logistics.shipments FOR EACH STATEMENT EXECUTE FUNCTION intake.immutable_fact();
-- statement
CREATE TRIGGER logistics_delivery_immutable BEFORE UPDATE OR DELETE ON logistics.deliveries FOR EACH ROW EXECUTE FUNCTION intake.immutable_fact();
-- statement
CREATE TRIGGER logistics_delivery_no_truncate BEFORE TRUNCATE ON logistics.deliveries FOR EACH STATEMENT EXECUTE FUNCTION intake.immutable_fact();
-- statement
CREATE FUNCTION logistics.guard_amount() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_TABLE_NAME='movements' THEN
  IF NEW.amount_kg IS DISTINCT FROM (SELECT admitted_kg FROM inventory.entries WHERE id=NEW.entry_id) THEN RAISE EXCEPTION 'whole lot movement required' USING ERRCODE='23514'; END IF;
 ELSE
  IF NOT EXISTS(SELECT 1 FROM logistics.shipments s WHERE s.id=NEW.shipment_id AND s.state='delivered' AND s.quantity_kg=NEW.received_kg AND NEW.delivered_at>=s.departed_at AND NEW.delivered_at<=clock_timestamp()) THEN RAISE EXCEPTION 'total delivery after departure required' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW;
END;
$$;
-- statement
CREATE TRIGGER logistics_movement_amount BEFORE INSERT ON inventory.movements FOR EACH ROW EXECUTE FUNCTION logistics.guard_amount();
-- statement
CREATE TRIGGER logistics_delivery_amount BEFORE INSERT ON logistics.deliveries FOR EACH ROW EXECUTE FUNCTION logistics.guard_amount();
-- statement
CREATE TABLE logistics.guide_references(
 organization_id uuid NOT NULL, center_id uuid NOT NULL, reference varchar(120) NOT NULL CHECK(reference=upper(trim(reference)) AND length(reference)>0),
 shipment_id uuid NOT NULL, entry_id uuid NOT NULL, assigned_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(organization_id,center_id,reference),
 FOREIGN KEY(shipment_id,entry_id,organization_id,center_id) REFERENCES logistics.shipments(id,entry_id,organization_id,center_id)
);
-- statement
CREATE TRIGGER logistics_guide_immutable BEFORE UPDATE OR DELETE ON logistics.guide_references FOR EACH ROW EXECUTE FUNCTION intake.immutable_fact();
-- statement
CREATE TRIGGER logistics_guide_no_truncate BEFORE TRUNCATE ON logistics.guide_references FOR EACH STATEMENT EXECUTE FUNCTION intake.immutable_fact();
-- statement
CREATE FUNCTION logistics.claim_guide() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE ref text;
BEGIN
 ref := NEW.transport->>'guideReference';
 IF ref IS NOT NULL THEN
  INSERT INTO logistics.guide_references(organization_id,center_id,reference,shipment_id,entry_id) VALUES(NEW.organization_id,NEW.center_id,ref,NEW.id,NEW.entry_id) ON CONFLICT DO NOTHING;
  IF NOT EXISTS(SELECT 1 FROM logistics.guide_references WHERE organization_id=NEW.organization_id AND center_id=NEW.center_id AND reference=ref AND shipment_id=NEW.id) THEN RAISE EXCEPTION 'guide already assigned to another shipment' USING ERRCODE='23505',CONSTRAINT='logistics_guide_reference_unique'; END IF;
 END IF;
 RETURN NEW;
END;
$$;
-- statement
CREATE TRIGGER logistics_claim_guide AFTER INSERT OR UPDATE OF transport ON logistics.shipments FOR EACH ROW EXECUTE FUNCTION logistics.claim_guide();
