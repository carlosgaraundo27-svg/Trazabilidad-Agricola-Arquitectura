-- statement
CREATE SCHEMA intake;
-- statement
CREATE SCHEMA traceability;
-- statement
ALTER TABLE harvest.pre_lots ADD CONSTRAINT pre_lots_id_org_unique UNIQUE(id,organization_id);
-- statement
CREATE TABLE access.centers(
 id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES access.organizations,
 name text NOT NULL, UNIQUE(id,organization_id)
);
-- statement
CREATE TABLE access.center_grants(
 user_id uuid NOT NULL, center_id uuid NOT NULL, organization_id uuid NOT NULL,
 action text NOT NULL CHECK(action IN ('intake:read','intake:receive','intake:review','intake:confirm','lot:consolidate')),
 PRIMARY KEY(user_id,center_id,action),
 FOREIGN KEY(user_id,organization_id) REFERENCES access.users(id,organization_id),
 FOREIGN KEY(center_id,organization_id) REFERENCES access.centers(id,organization_id)
);
-- statement
CREATE TABLE intake.receipts(
 id uuid PRIMARY KEY, organization_id uuid NOT NULL, center_id uuid NOT NULL,
 pre_lot_id uuid NOT NULL UNIQUE, reference varchar(120) NOT NULL CHECK(length(trim(reference))>0),
 origin jsonb NOT NULL, gross_kg numeric(12,3) NOT NULL, tare_kg numeric(12,3) NOT NULL,
 net_kg numeric(12,3) GENERATED ALWAYS AS (gross_kg-tare_kg) STORED,
 difference_kg numeric(12,3), review_reason text,
 evidence varchar(500) NOT NULL CHECK(length(trim(evidence))>0), captured_by uuid NOT NULL,
 captured_at timestamptz NOT NULL DEFAULT now(),
 CHECK(gross_kg>tare_kg AND tare_kg>=0 AND gross_kg<='999999999.999'::numeric),
 CHECK(jsonb_typeof(origin)='object' AND origin ?& ARRAY['id','organizationId','producerId','parcelId','harvestId','quantity','unit','harvestedAt','localHarvestDate']),
 CHECK(origin->>'id'=pre_lot_id::text AND origin->>'organizationId'=organization_id::text),
 CHECK((origin->>'unit'='kg' AND difference_kg IS NOT NULL AND difference_kg=gross_kg-tare_kg-(origin->>'quantity')::numeric AND
   ((difference_kg=0 AND review_reason IS NULL) OR (difference_kg<>0 AND review_reason='quantity_difference')))
   OR (origin->>'unit'='unidad' AND difference_kg IS NULL AND review_reason='different_unit')),
 UNIQUE(center_id,reference), UNIQUE(id,organization_id,center_id),
 FOREIGN KEY(center_id,organization_id) REFERENCES access.centers(id,organization_id),
 FOREIGN KEY(pre_lot_id,organization_id) REFERENCES harvest.pre_lots(id,organization_id),
 FOREIGN KEY(captured_by,organization_id) REFERENCES access.users(id,organization_id)
);
-- statement
CREATE INDEX receipts_center ON intake.receipts(center_id,organization_id,id);
-- statement
CREATE TABLE intake.reviews(
 id uuid PRIMARY KEY, receipt_id uuid NOT NULL UNIQUE REFERENCES intake.receipts,
 organization_id uuid NOT NULL, approved_by uuid NOT NULL, note varchar(500) NOT NULL CHECK(length(trim(note))>0),
 approved_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(approved_by,organization_id) REFERENCES access.users(id,organization_id)
);
-- statement
CREATE TABLE intake.confirmations(
 id uuid PRIMARY KEY, receipt_id uuid NOT NULL UNIQUE REFERENCES intake.receipts,
 organization_id uuid NOT NULL, confirmed_by uuid NOT NULL, confirmed_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(confirmed_by,organization_id) REFERENCES access.users(id,organization_id)
);
-- statement
CREATE TABLE intake.events(
 id uuid PRIMARY KEY, receipt_id uuid NOT NULL REFERENCES intake.receipts,
 organization_id uuid NOT NULL, actor_id uuid NOT NULL, kind text NOT NULL CHECK(kind IN ('received','reviewed','confirmed')),
 payload jsonb NOT NULL, occurred_at timestamptz NOT NULL DEFAULT now(), UNIQUE(receipt_id,kind),
 FOREIGN KEY(actor_id,organization_id) REFERENCES access.users(id,organization_id)
);
-- statement
CREATE TABLE intake.requests(
 actor_id uuid NOT NULL, request_key uuid NOT NULL, organization_id uuid NOT NULL, center_id uuid NOT NULL,
 action text NOT NULL, request_hash text NOT NULL, response jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(actor_id,request_key),
 FOREIGN KEY(actor_id,organization_id) REFERENCES access.users(id,organization_id),
 FOREIGN KEY(center_id,organization_id) REFERENCES access.centers(id,organization_id)
);
-- statement
CREATE TABLE traceability.lots(
 id uuid PRIMARY KEY, organization_id uuid NOT NULL, center_id uuid NOT NULL,
 producer_id uuid NOT NULL, parcel_id uuid NOT NULL, local_harvest_date date NOT NULL,
 status text NOT NULL DEFAULT 'consolidated' CHECK(status='consolidated'),
 quality_status text NOT NULL DEFAULT 'pending_quality' CHECK(quality_status='pending_quality'),
 created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(id,organization_id,center_id),
 FOREIGN KEY(center_id,organization_id) REFERENCES access.centers(id,organization_id),
 FOREIGN KEY(producer_id,organization_id) REFERENCES producers.producers(id,organization_id),
 FOREIGN KEY(parcel_id,organization_id) REFERENCES producers.parcels(id,organization_id),
 FOREIGN KEY(created_by,organization_id) REFERENCES access.users(id,organization_id)
);
-- statement
CREATE INDEX lots_center ON traceability.lots(center_id,organization_id,id);
-- statement
CREATE TABLE traceability.contributions(
 id uuid PRIMARY KEY, lot_id uuid NOT NULL, receipt_id uuid NOT NULL UNIQUE,
 organization_id uuid NOT NULL, center_id uuid NOT NULL,
 amount_kg numeric(12,3) NOT NULL CHECK(amount_kg>0), origin jsonb NOT NULL,
 actor_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(lot_id,organization_id,center_id) REFERENCES traceability.lots(id,organization_id,center_id),
 FOREIGN KEY(receipt_id,organization_id,center_id) REFERENCES intake.receipts(id,organization_id,center_id),
 FOREIGN KEY(actor_id,organization_id) REFERENCES access.users(id,organization_id)
);
-- statement
CREATE INDEX contributions_lot ON traceability.contributions(lot_id);
-- statement
CREATE TABLE traceability.events(
 id uuid PRIMARY KEY, lot_id uuid NOT NULL UNIQUE REFERENCES traceability.lots,
 organization_id uuid NOT NULL, actor_id uuid NOT NULL, kind text NOT NULL CHECK(kind='consolidated'),
 payload jsonb NOT NULL, occurred_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(actor_id,organization_id) REFERENCES access.users(id,organization_id)
);
-- statement
CREATE FUNCTION intake.immutable_fact() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 RAISE EXCEPTION 'closed facts are immutable' USING ERRCODE='23514';
END;
$$;
-- statement
CREATE FUNCTION intake.guard_review() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE r intake.receipts;
BEGIN
 SELECT * INTO STRICT r FROM intake.receipts WHERE id=NEW.receipt_id FOR UPDATE;
 IF r.organization_id<>NEW.organization_id OR r.captured_by=NEW.approved_by OR r.review_reason IS NULL
 OR EXISTS(SELECT 1 FROM intake.confirmations WHERE receipt_id=r.id) THEN
  RAISE EXCEPTION 'review requires independent actor and open discrepancy' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END;
$$;
-- statement
CREATE TRIGGER review_guard BEFORE INSERT ON intake.reviews FOR EACH ROW EXECUTE FUNCTION intake.guard_review();
-- statement
CREATE FUNCTION intake.guard_confirmation() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE r intake.receipts;
BEGIN
 SELECT * INTO STRICT r FROM intake.receipts WHERE id=NEW.receipt_id FOR UPDATE;
 IF r.organization_id<>NEW.organization_id OR (r.review_reason IS NOT NULL AND NOT EXISTS(SELECT 1 FROM intake.reviews WHERE receipt_id=r.id)) THEN
  RAISE EXCEPTION 'receipt requires review before confirmation' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END;
$$;
-- statement
CREATE TRIGGER confirmation_guard BEFORE INSERT ON intake.confirmations FOR EACH ROW EXECUTE FUNCTION intake.guard_confirmation();
-- statement
CREATE FUNCTION traceability.guard_contribution() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE r intake.receipts; l traceability.lots;
BEGIN
 SELECT * INTO STRICT r FROM intake.receipts WHERE id=NEW.receipt_id FOR UPDATE;
 SELECT * INTO STRICT l FROM traceability.lots WHERE id=NEW.lot_id FOR UPDATE;
 IF EXISTS(SELECT 1 FROM traceability.events WHERE lot_id=l.id)
 OR NOT EXISTS(SELECT 1 FROM intake.confirmations WHERE receipt_id=r.id)
 OR NEW.amount_kg<>r.net_kg OR NEW.origin<>r.origin
 OR l.producer_id::text<>r.origin->>'producerId' OR l.parcel_id::text<>r.origin->>'parcelId'
 OR l.local_harvest_date::text<>r.origin->>'localHarvestDate' THEN
  RAISE EXCEPTION 'contribution must consume a confirmed compatible origin completely' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END;
$$;
-- statement
CREATE TRIGGER contribution_guard BEFORE INSERT ON traceability.contributions FOR EACH ROW EXECUTE FUNCTION traceability.guard_contribution();
-- statement
CREATE TRIGGER receipts_immutable BEFORE UPDATE OR DELETE ON intake.receipts FOR EACH ROW EXECUTE FUNCTION intake.immutable_fact();
-- statement
CREATE TRIGGER reviews_immutable BEFORE UPDATE OR DELETE ON intake.reviews FOR EACH ROW EXECUTE FUNCTION intake.immutable_fact();
-- statement
CREATE TRIGGER confirmations_immutable BEFORE UPDATE OR DELETE ON intake.confirmations FOR EACH ROW EXECUTE FUNCTION intake.immutable_fact();
-- statement
CREATE TRIGGER intake_events_immutable BEFORE UPDATE OR DELETE ON intake.events FOR EACH ROW EXECUTE FUNCTION intake.immutable_fact();
-- statement
CREATE TRIGGER requests_immutable BEFORE UPDATE OR DELETE ON intake.requests FOR EACH ROW EXECUTE FUNCTION intake.immutable_fact();
-- statement
CREATE TRIGGER lots_immutable BEFORE UPDATE OR DELETE ON traceability.lots FOR EACH ROW EXECUTE FUNCTION intake.immutable_fact();
-- statement
CREATE TRIGGER contributions_immutable BEFORE UPDATE OR DELETE ON traceability.contributions FOR EACH ROW EXECUTE FUNCTION intake.immutable_fact();
-- statement
CREATE TRIGGER trace_events_immutable BEFORE UPDATE OR DELETE ON traceability.events FOR EACH ROW EXECUTE FUNCTION intake.immutable_fact();
