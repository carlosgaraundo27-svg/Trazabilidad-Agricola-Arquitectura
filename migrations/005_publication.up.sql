-- statement
CREATE SCHEMA publication;
-- statement
ALTER TABLE access.center_grants DROP CONSTRAINT center_grants_action_check;
-- statement
ALTER TABLE access.center_grants ADD CONSTRAINT center_grants_action_check CHECK(action IN ('intake:read','intake:receive','intake:review','intake:confirm','lot:consolidate','quality:read','quality:create','quality:update','quality:close','publication:read','publication:publish','publication:withdraw'));
-- statement
CREATE TABLE publication.lots(
 lot_id uuid PRIMARY KEY, organization_id uuid NOT NULL, center_id uuid NOT NULL, public_id uuid NOT NULL UNIQUE,
 state text NOT NULL CHECK(state IN ('published','withdrawn')), version integer NOT NULL CHECK(version>0),
 content jsonb NOT NULL CHECK(jsonb_typeof(content)='object' AND content ?& ARRAY['lotCode','stages']),
 content_hash text NOT NULL CHECK(length(content_hash)=64),
 updated_by uuid NOT NULL, updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 FOREIGN KEY(lot_id,organization_id,center_id) REFERENCES traceability.lots(id,organization_id,center_id),
 FOREIGN KEY(updated_by,organization_id) REFERENCES access.users(id,organization_id)
);
-- statement
CREATE TABLE publication.history(
 lot_id uuid NOT NULL REFERENCES publication.lots(lot_id), version integer NOT NULL,
 state text NOT NULL CHECK(state IN ('published','withdrawn')), content jsonb NOT NULL,
 actor_id uuid NOT NULL, organization_id uuid NOT NULL, occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(lot_id,version), FOREIGN KEY(actor_id,organization_id) REFERENCES access.users(id,organization_id)
);
-- statement
CREATE TABLE publication.requests(
 actor_id uuid NOT NULL, request_key uuid NOT NULL, organization_id uuid NOT NULL, request_hash text NOT NULL, response jsonb NOT NULL,
 PRIMARY KEY(actor_id,request_key), FOREIGN KEY(actor_id,organization_id) REFERENCES access.users(id,organization_id)
);
-- statement
CREATE FUNCTION publication.guard_state() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'publication cannot be deleted' USING ERRCODE='23514'; END IF;
 IF NEW.lot_id<>OLD.lot_id OR NEW.organization_id<>OLD.organization_id OR NEW.center_id<>OLD.center_id OR NEW.public_id<>OLD.public_id OR NEW.version<>OLD.version+1 THEN
  RAISE EXCEPTION 'publication identity immutable, version must advance' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END;
$$;
-- statement
CREATE TRIGGER publication_guard BEFORE UPDATE OR DELETE ON publication.lots FOR EACH ROW EXECUTE FUNCTION publication.guard_state();
-- statement
CREATE TRIGGER publication_no_truncate BEFORE TRUNCATE ON publication.lots FOR EACH STATEMENT EXECUTE FUNCTION intake.immutable_fact();
-- statement
CREATE TRIGGER publication_history_immutable BEFORE UPDATE OR DELETE ON publication.history FOR EACH ROW EXECUTE FUNCTION intake.immutable_fact();
-- statement
CREATE TRIGGER publication_history_no_truncate BEFORE TRUNCATE ON publication.history FOR EACH STATEMENT EXECUTE FUNCTION intake.immutable_fact();
-- statement
CREATE TRIGGER publication_requests_immutable BEFORE UPDATE OR DELETE ON publication.requests FOR EACH ROW EXECUTE FUNCTION intake.immutable_fact();
-- statement
CREATE TRIGGER publication_requests_no_truncate BEFORE TRUNCATE ON publication.requests FOR EACH STATEMENT EXECUTE FUNCTION intake.immutable_fact();
