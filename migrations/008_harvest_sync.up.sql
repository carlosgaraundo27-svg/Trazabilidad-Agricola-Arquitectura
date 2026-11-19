-- statement
ALTER TABLE harvest.pre_lots ADD CONSTRAINT pre_lots_sync_identity
 UNIQUE(id,harvest_id,organization_id,actor_id);
-- statement
CREATE TABLE harvest.sync_receipts(
 organization_id uuid NOT NULL,
 client_capture_id uuid NOT NULL,
 actor_id uuid NOT NULL,
 pre_lot_id uuid NOT NULL UNIQUE,
 harvest_id uuid NOT NULL UNIQUE,
 schema_version smallint NOT NULL CHECK(schema_version=1),
 payload_hash text NOT NULL CHECK(payload_hash ~ '^[0-9a-f]{64}$'),
 payload jsonb NOT NULL CHECK(jsonb_typeof(payload)='object'),
 result jsonb NOT NULL CHECK(jsonb_typeof(result)='object'),
 accepted_at timestamptz NOT NULL,
 PRIMARY KEY(organization_id,client_capture_id),
 FOREIGN KEY(actor_id,organization_id) REFERENCES access.users(id,organization_id),
 FOREIGN KEY(pre_lot_id,harvest_id,organization_id,actor_id)
  REFERENCES harvest.pre_lots(id,harvest_id,organization_id,actor_id)
);
-- statement
CREATE FUNCTION harvest.reject_sync_receipt_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 RAISE EXCEPTION 'Accepted sync receipts are immutable' USING ERRCODE='55000';
END $$;
-- statement
CREATE TRIGGER sync_receipts_immutable BEFORE UPDATE OR DELETE ON harvest.sync_receipts
 FOR EACH ROW EXECUTE FUNCTION harvest.reject_sync_receipt_change();
-- statement
CREATE TRIGGER sync_receipts_no_truncate BEFORE TRUNCATE ON harvest.sync_receipts
 FOR EACH STATEMENT EXECUTE FUNCTION harvest.reject_sync_receipt_change();
