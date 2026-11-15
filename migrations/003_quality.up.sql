-- statement
CREATE SCHEMA quality;
-- statement
ALTER TABLE access.center_grants DROP CONSTRAINT center_grants_action_check;
-- statement
ALTER TABLE access.center_grants ADD CONSTRAINT center_grants_action_check CHECK(action IN ('intake:read','intake:receive','intake:review','intake:confirm','lot:consolidate','quality:read','quality:create','quality:update','quality:close'));
-- statement
CREATE TABLE quality.evaluations(
 id uuid PRIMARY KEY, lot_id uuid NOT NULL UNIQUE, organization_id uuid NOT NULL, center_id uuid NOT NULL,
 state text NOT NULL DEFAULT 'draft' CHECK(state IN ('draft','closed')), version integer NOT NULL DEFAULT 1 CHECK(version>0),
 capture jsonb NOT NULL CHECK(jsonb_typeof(capture)='object' AND capture ?& ARRAY['sample','weights','dryMatter','discard','temperatures']),
 result text CHECK(result IN ('accepted','observed','rejected')), note varchar(500),
 created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_by uuid NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(),
 closed_by uuid, closed_at timestamptz,
 CHECK((state='draft' AND result IS NULL AND note IS NULL AND closed_by IS NULL AND closed_at IS NULL)
   OR (state='closed' AND result IS NOT NULL AND note IS NOT NULL AND length(trim(note))>0 AND closed_by IS NOT NULL AND closed_at IS NOT NULL)),
 UNIQUE(id,organization_id),
 FOREIGN KEY(lot_id,organization_id,center_id) REFERENCES traceability.lots(id,organization_id,center_id),
 FOREIGN KEY(created_by,organization_id) REFERENCES access.users(id,organization_id),
 FOREIGN KEY(updated_by,organization_id) REFERENCES access.users(id,organization_id),
 FOREIGN KEY(closed_by,organization_id) REFERENCES access.users(id,organization_id)
);
-- statement
CREATE INDEX evaluations_center ON quality.evaluations(organization_id,center_id,id);
-- statement
CREATE TABLE quality.events(
 id uuid PRIMARY KEY, evaluation_id uuid NOT NULL, organization_id uuid NOT NULL, actor_id uuid NOT NULL,
 kind text NOT NULL CHECK(kind IN ('created','updated','closed')), version integer NOT NULL CHECK(version>0),
 payload jsonb NOT NULL, occurred_at timestamptz NOT NULL DEFAULT now(), UNIQUE(evaluation_id,version),
 FOREIGN KEY(evaluation_id,organization_id) REFERENCES quality.evaluations(id,organization_id),
 FOREIGN KEY(actor_id,organization_id) REFERENCES access.users(id,organization_id)
);
-- statement
CREATE TABLE quality.requests(
 actor_id uuid NOT NULL, request_key uuid NOT NULL, organization_id uuid NOT NULL, center_id uuid NOT NULL,
 request_hash text NOT NULL, response jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(actor_id,request_key),
 FOREIGN KEY(actor_id,organization_id) REFERENCES access.users(id,organization_id),
 FOREIGN KEY(center_id,organization_id) REFERENCES access.centers(id,organization_id)
);
-- statement
CREATE FUNCTION quality.guard_evaluation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' OR OLD.state='closed' THEN
  RAISE EXCEPTION 'quality closed facts cannot be changed or deleted' USING ERRCODE='23514';
 END IF;
 IF NEW.id<>OLD.id OR NEW.lot_id<>OLD.lot_id OR NEW.organization_id<>OLD.organization_id OR NEW.center_id<>OLD.center_id
 OR NEW.created_by<>OLD.created_by OR NEW.created_at<>OLD.created_at OR NEW.version<>OLD.version+1 THEN
  RAISE EXCEPTION 'quality identity is immutable and version must advance once' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END;
$$;
-- statement
CREATE TRIGGER evaluation_guard BEFORE UPDATE OR DELETE ON quality.evaluations FOR EACH ROW EXECUTE FUNCTION quality.guard_evaluation();
-- statement
CREATE TRIGGER evaluations_no_truncate BEFORE TRUNCATE ON quality.evaluations FOR EACH STATEMENT EXECUTE FUNCTION intake.immutable_fact();
-- statement
CREATE TRIGGER quality_events_immutable BEFORE UPDATE OR DELETE ON quality.events FOR EACH ROW EXECUTE FUNCTION intake.immutable_fact();
-- statement
CREATE TRIGGER quality_events_no_truncate BEFORE TRUNCATE ON quality.events FOR EACH STATEMENT EXECUTE FUNCTION intake.immutable_fact();
-- statement
CREATE TRIGGER quality_requests_immutable BEFORE UPDATE OR DELETE ON quality.requests FOR EACH ROW EXECUTE FUNCTION intake.immutable_fact();
-- statement
CREATE TRIGGER quality_requests_no_truncate BEFORE TRUNCATE ON quality.requests FOR EACH STATEMENT EXECUTE FUNCTION intake.immutable_fact();
