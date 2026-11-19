-- statement
LOCK TABLE harvest.sync_receipts IN ACCESS EXCLUSIVE MODE;
-- statement
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM harvest.sync_receipts) THEN
  RAISE EXCEPTION 'Preserve accepted receipts; destructive rollback is blocked' USING ERRCODE='55000';
 END IF;
END $$;
-- statement
DROP TABLE harvest.sync_receipts;
-- statement
DROP FUNCTION harvest.reject_sync_receipt_change();
-- statement
ALTER TABLE harvest.pre_lots DROP CONSTRAINT pre_lots_sync_identity;
