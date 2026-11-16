const select = `SELECT l.id,l.organization_id AS "organizationId",l.center_id AS "centerId",l.producer_id AS "producerId",l.parcel_id AS "parcelId",l.local_harvest_date::text AS "localHarvestDate",l.status,l.quality_status AS "qualityStatus",false AS "dispatchAuthorized",l.created_by AS "createdBy",l.created_at AS "createdAt", (SELECT COALESCE(sum(a.amount_kg),0)::numeric(15,3)::text FROM traceability.contributions a WHERE a.lot_id=l.id) AS "totalKg", COALESCE((SELECT jsonb_agg(jsonb_build_object('id',a.id,'receiptId',a.receipt_id,'amountKg',a.amount_kg::text,'origin',a.origin,'createdBy',a.actor_id,'createdAt',a.created_at) ORDER BY a.receipt_id) FROM traceability.contributions a WHERE a.lot_id=l.id),'[]'::jsonb) AS contributions, COALESCE((SELECT jsonb_agg(jsonb_build_object('id',e.id,'kind',e.kind,'actorId',e.actor_id,'occurredAt',e.occurred_at,'payload',e.payload) ORDER BY e.id) FROM traceability.events e WHERE e.lot_id=l.id),'[]'::jsonb) AS events FROM traceability.lots l`;
export function traceabilityRepository() {
  return {
    async identity(tx, actor, id, lock = "none") {
      let lockClause = "";
      if (lock === "share") lockClause = " FOR SHARE";
      if (lock === "update") lockClause = " FOR UPDATE";
      return (
        await tx.query(
          'SELECT id,center_id AS "centerId" FROM traceability.lots WHERE organization_id=$1 AND id=$2' +
            lockClause,
          [actor.organizationId, id],
        )
      ).rows[0];
    },
    async identities(tx, actor, centerId, offset) {
      return (
        await tx.query(
          'SELECT id,center_id AS "centerId" FROM traceability.lots WHERE organization_id=$1 AND center_id=$2 ORDER BY id LIMIT 100 OFFSET $3',
          [actor.organizationId, centerId, offset],
        )
      ).rows;
    },
    async consumed(tx, actor, centerId, ids) {
      return (
        await tx.query(
          'SELECT receipt_id AS "receiptId",amount_kg::text AS "amountKg",lot_id AS "lotId" FROM traceability.contributions WHERE organization_id=$1 AND center_id=$2 AND receipt_id=ANY($3::uuid[])',
          [actor.organizationId, centerId, ids],
        )
      ).rows;
    },
    async create(tx, actor, receipts) {
      const id = crypto.randomUUID(),
        first = receipts[0];
      await tx.query(
        "INSERT INTO traceability.lots(id,organization_id,center_id,producer_id,parcel_id,local_harvest_date,created_by) VALUES($1,$2,$3,$4,$5,$6,$7)",
        [
          id,
          actor.organizationId,
          first.centerId,
          first.origin.producerId,
          first.origin.parcelId,
          first.origin.localHarvestDate,
          actor.id,
        ],
      );
      for (const receipt of receipts)
        await tx.query(
          "INSERT INTO traceability.contributions(id,lot_id,receipt_id,organization_id,center_id,amount_kg,origin,actor_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
          [
            crypto.randomUUID(),
            id,
            receipt.id,
            actor.organizationId,
            receipt.centerId,
            receipt.netKg,
            JSON.stringify(receipt.origin),
            actor.id,
          ],
        );
      return id;
    },
    async event(tx, actor, id, payload) {
      await tx.query(
        "INSERT INTO traceability.events(id,lot_id,organization_id,actor_id,kind,payload) VALUES($1,$2,$3,$4,'consolidated',$5)",
        [
          crypto.randomUUID(),
          id,
          actor.organizationId,
          actor.id,
          JSON.stringify(payload),
        ],
      );
    },
    async get(tx, actor, centerId, id) {
      return (
        await tx.query(
          select + " WHERE l.organization_id=$1 AND l.center_id=$2 AND l.id=$3",
          [actor.organizationId, centerId, id],
        )
      ).rows[0];
    },
    async list(tx, actor, centerId, offset) {
      return (
        await tx.query(
          select +
            " WHERE l.organization_id=$1 AND l.center_id=$2 ORDER BY l.id LIMIT 100 OFFSET $3",
          [actor.organizationId, centerId, offset],
        )
      ).rows;
    },
  };
}
