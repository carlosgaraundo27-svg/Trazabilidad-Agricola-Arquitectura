const select = `SELECT r.id,r.organization_id AS "organizationId",r.center_id AS "centerId",r.pre_lot_id AS "preLotId",
 r.reference,r.origin,r.gross_kg::text AS "grossKg",r.tare_kg::text AS "tareKg",r.net_kg::text AS "netKg",
 r.difference_kg::text AS "differenceKg",r.review_reason AS "reviewReason",r.evidence,
 r.captured_by AS "capturedBy",r.captured_at AS "capturedAt",
 CASE WHEN c.id IS NOT NULL THEN 'confirmed' WHEN r.review_reason IS NOT NULL AND v.id IS NULL THEN 'pending_review' ELSE 'weighed' END AS status,
 CASE WHEN v.id IS NULL THEN NULL ELSE jsonb_build_object('id',v.id,'approvedBy',v.approved_by,'approvedAt',v.approved_at,'note',v.note) END AS review,
 c.confirmed_by AS "confirmedBy",c.confirmed_at AS "confirmedAt",
 COALESCE((SELECT jsonb_agg(jsonb_build_object('id',e.id,'kind',e.kind,'actorId',e.actor_id,'occurredAt',e.occurred_at,'payload',e.payload) ORDER BY e.occurred_at,e.id) FROM intake.events e WHERE e.receipt_id=r.id),'[]'::jsonb) AS events
 FROM intake.receipts r LEFT JOIN intake.reviews v ON v.receipt_id=r.id LEFT JOIN intake.confirmations c ON c.receipt_id=r.id`;
export function intakeRepository() {
  return {
    async readSnapshot(tx) {
      await tx.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ");
    },
    async lockRequest(tx, actor, key) {
      await tx.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
        "intake:" + actor.id + ":" + key,
      ]);
    },
    async request(tx, actor, key) {
      return (
        await tx.query(
          "SELECT request_hash,response FROM intake.requests WHERE actor_id=$1 AND request_key=$2",
          [actor.id, key],
        )
      ).rows[0];
    },
    async saveRequest(tx, actor, key, centerId, action, hash, item) {
      await tx.query(
        "INSERT INTO intake.requests(actor_id,request_key,organization_id,center_id,action,request_hash,response) VALUES($1,$2,$3,$4,$5,$6,$7)",
        [
          actor.id,
          key,
          actor.organizationId,
          centerId,
          action,
          hash,
          JSON.stringify(item),
        ],
      );
    },
    async get(tx, actor, id) {
      return (
        await tx.query(select + " WHERE r.id=$1 AND r.organization_id=$2", [
          id,
          actor.organizationId,
        ])
      ).rows[0];
    },
    async list(tx, actor, centerId, offset) {
      return (
        await tx.query(
          select +
            " WHERE r.organization_id=$1 AND r.center_id=$2 ORDER BY r.id LIMIT 100 OFFSET $3",
          [actor.organizationId, centerId, offset],
        )
      ).rows;
    },
    async lockReceipts(tx, actor, centerId, ids) {
      await tx.query(
        "SELECT id FROM intake.receipts WHERE organization_id=$1 AND center_id=$2 AND id=ANY($3::uuid[]) ORDER BY id FOR UPDATE",
        [actor.organizationId, centerId, ids],
      );
    },
    async create(tx, actor, input, origin, measured) {
      const id = crypto.randomUUID();
      await tx.query(
        "INSERT INTO intake.receipts(id,organization_id,center_id,pre_lot_id,reference,origin,gross_kg,tare_kg,difference_kg,review_reason,evidence,captured_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)",
        [
          id,
          actor.organizationId,
          input.centerId,
          input.preLotId,
          input.reference,
          JSON.stringify(origin),
          input.grossKg,
          input.tareKg,
          measured.differenceKg,
          measured.reviewReason,
          input.evidence,
          actor.id,
        ],
      );
      return id;
    },
    async review(tx, actor, id, note) {
      await tx.query(
        "INSERT INTO intake.reviews(id,receipt_id,organization_id,approved_by,note) VALUES($1,$2,$3,$4,$5)",
        [crypto.randomUUID(), id, actor.organizationId, actor.id, note],
      );
    },
    async confirm(tx, actor, id) {
      await tx.query(
        "INSERT INTO intake.confirmations(id,receipt_id,organization_id,confirmed_by) VALUES($1,$2,$3,$4)",
        [crypto.randomUUID(), id, actor.organizationId, actor.id],
      );
    },
    async event(tx, actor, id, kind, payload) {
      await tx.query(
        "INSERT INTO intake.events(id,receipt_id,organization_id,actor_id,kind,payload) VALUES($1,$2,$3,$4,$5,$6)",
        [
          crypto.randomUUID(),
          id,
          actor.organizationId,
          actor.id,
          kind,
          JSON.stringify(payload),
        ],
      );
    },
  };
}
