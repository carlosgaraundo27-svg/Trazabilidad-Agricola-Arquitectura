-- statement
CREATE TABLE intake.receipt_temperatures(
 id uuid PRIMARY KEY, receipt_id uuid NOT NULL UNIQUE, organization_id uuid NOT NULL, center_id uuid NOT NULL,
 value_c numeric NOT NULL CHECK(value_c BETWEEN -999999.99 AND 999999.99 AND scale(value_c)<=2),
 unit text NOT NULL CHECK(unit='°C'), measured_at timestamptz NOT NULL,
 observed_by varchar(500) NOT NULL CHECK(length(trim(observed_by))>0),
 provenance varchar(500) NOT NULL CHECK(length(trim(provenance))>0), method varchar(500) NOT NULL CHECK(length(trim(method))>0),
 recorded_by uuid NOT NULL, recorded_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(receipt_id,organization_id,center_id) REFERENCES intake.receipts(id,organization_id,center_id),
 FOREIGN KEY(recorded_by,organization_id) REFERENCES access.users(id,organization_id),
 CHECK(measured_at<=recorded_at)
);
-- statement
CREATE FUNCTION intake.guard_original_temperature() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE r intake.receipts;
BEGIN
 SELECT * INTO STRICT r FROM intake.receipts WHERE id=NEW.receipt_id FOR UPDATE;
 IF r.captured_by<>NEW.recorded_by OR EXISTS(SELECT 1 FROM intake.events WHERE receipt_id=r.id AND kind='received') THEN
  RAISE EXCEPTION 'original temperature must be recorded with new receipt, no historical backfill' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END;
$$;
-- statement
CREATE TRIGGER original_temperature_guard BEFORE INSERT ON intake.receipt_temperatures FOR EACH ROW EXECUTE FUNCTION intake.guard_original_temperature();
-- statement
CREATE TRIGGER original_temperature_immutable BEFORE UPDATE OR DELETE ON intake.receipt_temperatures FOR EACH ROW EXECUTE FUNCTION intake.immutable_fact();
-- statement
CREATE TRIGGER original_temperature_no_truncate BEFORE TRUNCATE ON intake.receipt_temperatures FOR EACH STATEMENT EXECUTE FUNCTION intake.immutable_fact();
-- statement
CREATE FUNCTION quality.guard_closure() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.state='closed' THEN
  IF EXISTS(SELECT 1 FROM traceability.contributions c LEFT JOIN intake.receipt_temperatures t ON t.receipt_id=c.receipt_id AND t.organization_id=c.organization_id AND t.center_id=c.center_id WHERE c.lot_id=NEW.lot_id AND t.id IS NULL)
  OR NOT EXISTS(SELECT 1 FROM traceability.contributions WHERE lot_id=NEW.lot_id) THEN
   RAISE EXCEPTION 'each contributing receipt requires its original temperature' USING ERRCODE='23514';
  END IF;
  IF NEW.capture->'sample'='null'::jsonb OR jsonb_array_length(NEW.capture->'weights')=0
  OR NEW.capture->'dryMatter'='null'::jsonb OR NEW.capture->'discard'='null'::jsonb THEN
   RAISE EXCEPTION 'quality capture must be complete before closure' USING ERRCODE='23514';
  END IF;
 END IF;
 RETURN NEW;
END;
$$;
-- statement
CREATE TRIGGER quality_closure_guard BEFORE INSERT OR UPDATE ON quality.evaluations FOR EACH ROW EXECUTE FUNCTION quality.guard_closure();
