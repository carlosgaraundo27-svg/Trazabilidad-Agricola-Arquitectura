-- statement
CREATE SCHEMA inventory;
-- statement
ALTER TABLE access.center_grants DROP CONSTRAINT center_grants_action_check;
-- statement
ALTER TABLE access.center_grants ADD CONSTRAINT center_grants_action_check CHECK(action IN ('intake:read','intake:receive','intake:review','intake:confirm','lot:consolidate','quality:read','quality:create','quality:update','quality:close','publication:read','publication:publish','publication:withdraw','inventory:read','inventory:admit','inventory:release','shipment:read','shipment:create','shipment:update','shipment:reserve','shipment:dispatch','shipment:deliver','shipment:cancel'));
-- statement
CREATE TABLE inventory.entries(
 id uuid PRIMARY KEY, lot_id uuid NOT NULL UNIQUE, organization_id uuid NOT NULL, center_id uuid NOT NULL,
 admitted_kg numeric(15,3) NOT NULL CHECK(admitted_kg>0), disposition text NOT NULL DEFAULT 'quarantine' CHECK(disposition IN ('quarantine','released')),
 version integer NOT NULL DEFAULT 1 CHECK(version>0), reference varchar(120) NOT NULL CHECK(length(trim(reference))>0), evidence_ref varchar(500) NOT NULL CHECK(length(trim(evidence_ref))>0),
 created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 release_evaluation_id uuid, release_evaluation_version integer, release_reason varchar(500), released_by uuid, released_at timestamptz,
 CHECK((disposition='quarantine' AND release_evaluation_id IS NULL AND release_evaluation_version IS NULL AND release_reason IS NULL AND released_by IS NULL AND released_at IS NULL) OR (disposition='released' AND release_evaluation_id IS NOT NULL AND release_evaluation_version IS NOT NULL AND release_evaluation_version>0 AND release_reason IS NOT NULL AND length(trim(release_reason))>0 AND released_by IS NOT NULL AND released_at IS NOT NULL)),
 UNIQUE(id,organization_id,center_id),
 FOREIGN KEY(lot_id,organization_id,center_id) REFERENCES traceability.lots(id,organization_id,center_id),
 FOREIGN KEY(created_by,organization_id) REFERENCES access.users(id,organization_id),
 FOREIGN KEY(released_by,organization_id) REFERENCES access.users(id,organization_id),
 FOREIGN KEY(release_evaluation_id,organization_id) REFERENCES quality.evaluations(id,organization_id)
);
-- statement
CREATE INDEX inventory_entries_center ON inventory.entries(organization_id,center_id,id);
-- statement
CREATE TABLE inventory.movements(
 id uuid PRIMARY KEY, entry_id uuid NOT NULL, organization_id uuid NOT NULL, center_id uuid NOT NULL, shipment_id uuid,
 kind text NOT NULL CHECK(kind IN ('admitted','reserved','reservation_released','dispatched','delivered')), amount_kg numeric(15,3) NOT NULL CHECK(amount_kg>0),
 actor_id uuid NOT NULL, occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(), recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK((kind='admitted' AND shipment_id IS NULL) OR (kind<>'admitted' AND shipment_id IS NOT NULL)),
 UNIQUE(shipment_id,kind),
 FOREIGN KEY(entry_id,organization_id,center_id) REFERENCES inventory.entries(id,organization_id,center_id),
 FOREIGN KEY(actor_id,organization_id) REFERENCES access.users(id,organization_id)
);
-- statement
CREATE UNIQUE INDEX inventory_one_admission ON inventory.movements(entry_id) WHERE kind='admitted';
-- statement
CREATE UNIQUE INDEX inventory_one_departure ON inventory.movements(entry_id) WHERE kind='dispatched';
-- statement
CREATE INDEX inventory_movements_entry ON inventory.movements(entry_id,recorded_at,id);
-- statement
CREATE TABLE inventory.events(
 id uuid PRIMARY KEY, entry_id uuid NOT NULL, shipment_id uuid, organization_id uuid NOT NULL, center_id uuid NOT NULL, actor_id uuid NOT NULL,
 kind text NOT NULL CHECK(kind IN ('admitted','released','created','transport_corrected','reserved','cancelled','dispatched','delivered')),
 version integer NOT NULL CHECK(version>0), payload jsonb NOT NULL, occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(shipment_id,version),
 FOREIGN KEY(entry_id,organization_id,center_id) REFERENCES inventory.entries(id,organization_id,center_id),
 FOREIGN KEY(actor_id,organization_id) REFERENCES access.users(id,organization_id)
);
-- statement
CREATE UNIQUE INDEX inventory_entry_event_version ON inventory.events(entry_id,version) WHERE shipment_id IS NULL;
-- statement
CREATE TABLE inventory.requests(
 actor_id uuid NOT NULL, request_key uuid NOT NULL, organization_id uuid NOT NULL, center_id uuid NOT NULL,
 request_hash text NOT NULL CHECK(length(request_hash)=64), response jsonb NOT NULL, PRIMARY KEY(actor_id,request_key),
 FOREIGN KEY(actor_id,organization_id) REFERENCES access.users(id,organization_id),
 FOREIGN KEY(center_id,organization_id) REFERENCES access.centers(id,organization_id)
);
-- statement
CREATE FUNCTION inventory.guard_entry() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'inventory entry cannot be deleted' USING ERRCODE='23514'; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.version<>1 OR NEW.disposition<>'quarantine' OR NEW.admitted_kg IS DISTINCT FROM (SELECT sum(amount_kg) FROM traceability.contributions WHERE lot_id=NEW.lot_id AND organization_id=NEW.organization_id AND center_id=NEW.center_id) THEN RAISE EXCEPTION 'admission must equal documented lot' USING ERRCODE='23514'; END IF;
 ELSE
  IF (to_jsonb(NEW)-ARRAY['version','disposition','release_evaluation_id','release_evaluation_version','release_reason','released_by','released_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['version','disposition','release_evaluation_id','release_evaluation_version','release_reason','released_by','released_at']) OR NEW.version<>OLD.version+1 THEN RAISE EXCEPTION 'inventory identity immutable, version must advance' USING ERRCODE='23514'; END IF;
  IF OLD.disposition='released' AND (to_jsonb(NEW)-'version') IS DISTINCT FROM (to_jsonb(OLD)-'version') THEN RAISE EXCEPTION 'release immutable' USING ERRCODE='23514'; END IF;
 END IF;
 IF NEW.disposition='released' AND NOT EXISTS(SELECT 1 FROM quality.evaluations q WHERE q.id=NEW.release_evaluation_id AND q.lot_id=NEW.lot_id AND q.organization_id=NEW.organization_id AND q.center_id=NEW.center_id AND q.state='closed' AND q.result='accepted' AND q.version=NEW.release_evaluation_version) THEN RAISE EXCEPTION 'closed accepted quality required' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END;
$$;
-- statement
CREATE TRIGGER inventory_entry_guard BEFORE INSERT OR UPDATE OR DELETE ON inventory.entries FOR EACH ROW EXECUTE FUNCTION inventory.guard_entry();
-- statement
CREATE TRIGGER inventory_entry_no_truncate BEFORE TRUNCATE ON inventory.entries FOR EACH STATEMENT EXECUTE FUNCTION intake.immutable_fact();
-- statement
CREATE TRIGGER inventory_movement_immutable BEFORE UPDATE OR DELETE ON inventory.movements FOR EACH ROW EXECUTE FUNCTION intake.immutable_fact();
-- statement
CREATE TRIGGER inventory_movement_no_truncate BEFORE TRUNCATE ON inventory.movements FOR EACH STATEMENT EXECUTE FUNCTION intake.immutable_fact();
-- statement
CREATE TRIGGER inventory_event_immutable BEFORE UPDATE OR DELETE ON inventory.events FOR EACH ROW EXECUTE FUNCTION intake.immutable_fact();
-- statement
CREATE TRIGGER inventory_event_no_truncate BEFORE TRUNCATE ON inventory.events FOR EACH STATEMENT EXECUTE FUNCTION intake.immutable_fact();
-- statement
CREATE TRIGGER inventory_request_immutable BEFORE UPDATE OR DELETE ON inventory.requests FOR EACH ROW EXECUTE FUNCTION intake.immutable_fact();
-- statement
CREATE TRIGGER inventory_request_no_truncate BEFORE TRUNCATE ON inventory.requests FOR EACH STATEMENT EXECUTE FUNCTION intake.immutable_fact();
