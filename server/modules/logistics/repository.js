const entrySelect = `SELECT e.id,e.lot_id AS "lotId",e.center_id AS "centerId",e.admitted_kg::text AS "sourceKg",e.disposition,e.version,e.reference,e.evidence_ref AS "evidenceRef",e.created_by AS "createdBy",e.created_at AS "createdAt",e.release_evaluation_id AS "releaseEvaluationId",e.release_evaluation_version AS "releaseEvaluationVersion",e.release_reason AS "releaseReason",e.released_by AS "releasedBy",e.released_at AS "releasedAt" FROM inventory.entries e`;
export function logisticsRepository() {
  return {
    async inventoryPage(tx, actor, centerId, offset) {
      return (
        await tx.query(
          `SELECT e.id,e.lot_id AS "lotId",e.center_id AS "centerId",e.disposition,e.version,e.admitted_kg::text AS "sourceKg",COALESCE((SELECT jsonb_object_agg(kind,amount) FROM (SELECT kind,sum(amount_kg)::text AS amount FROM inventory.movements WHERE entry_id=e.id GROUP BY kind) totals),'{}'::jsonb) AS totals FROM inventory.entries e WHERE e.organization_id=$1 AND e.center_id=$2 ORDER BY e.id LIMIT 100 OFFSET $3`,
          [actor.organizationId, centerId, offset],
        )
      ).rows;
    },
    async entryProjection(tx, actor, lotIds) {
      return (
        await tx.query(
          'SELECT lot_id AS "lotId",id FROM inventory.entries WHERE organization_id=$1 AND lot_id=ANY($2::uuid[])',
          [actor.organizationId, lotIds],
        )
      ).rows;
    },
    async shipmentPage(tx, actor, centerId, offset) {
      return (
        await tx.query(
          'SELECT s.id,s.entry_id AS "stockEntryId",e.lot_id AS "lotId",s.center_id AS "centerId",s.quantity_kg::text AS "quantityKg",s.state,s.version,s.transport,s.destination_label AS "destinationLabel",s.departed_at AS "departedAt",s.created_at AS "createdAt" FROM logistics.shipments s JOIN inventory.entries e ON e.id=s.entry_id WHERE s.organization_id=$1 AND s.center_id=$2 ORDER BY s.id LIMIT 100 OFFSET $3',
          [actor.organizationId, centerId, offset],
        )
      ).rows;
    },
    async shipment(tx, actor, id, lock = "none") {
      const clause =
        lock === "update"
          ? " FOR UPDATE OF s"
          : lock === "share"
            ? " FOR SHARE OF s"
            : "";
      return (
        await tx.query(
          `SELECT s.id,s.entry_id AS "stockEntryId",e.lot_id AS "lotId",s.center_id AS "centerId",s.quantity_kg::text AS "quantityKg",s.state,s.version,s.transport,s.destination_label AS "destinationLabel",s.departed_at AS "departedAt",s.created_at AS "createdAt",s.updated_at AS "updatedAt",(SELECT jsonb_build_object('receivedKg',d.received_kg::text,'deliveredAt',d.delivered_at,'evidenceRef',d.evidence_ref,'actorId',d.actor_id,'recordedAt',d.recorded_at) FROM logistics.deliveries d WHERE d.shipment_id=s.id) AS delivery FROM logistics.shipments s JOIN inventory.entries e ON e.id=s.entry_id WHERE s.id=$1 AND s.organization_id=$2` +
            clause,
          [id, actor.organizationId],
        )
      ).rows[0];
    },
    async createShipment(tx, actor, entry, input) {
      const id = crypto.randomUUID();
      await tx.query(
        "INSERT INTO logistics.shipments(id,entry_id,organization_id,center_id,quantity_kg,transport,destination_label,created_by,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$8)",
        [
          id,
          entry.id,
          actor.organizationId,
          entry.centerId,
          entry.sourceKg,
          JSON.stringify(input.transport),
          input.destinationLabel,
          actor.id,
        ],
      );
      return id;
    },
    async correctTransport(tx, actor, id, input) {
      await tx.query(
        "UPDATE logistics.shipments SET transport=$1,destination_label=$2,version=version+1,updated_by=$3,updated_at=clock_timestamp() WHERE id=$4 AND organization_id=$5",
        [
          JSON.stringify(input.transport),
          input.destinationLabel,
          actor.id,
          id,
          actor.organizationId,
        ],
      );
    },
    async changeShipment(tx, actor, id, state, departedAt = null) {
      await tx.query(
        "UPDATE logistics.shipments SET state=$1,departed_at=COALESCE($2::timestamptz,departed_at),version=version+1,updated_by=$3,updated_at=clock_timestamp() WHERE id=$4 AND organization_id=$5",
        [state, departedAt, actor.id, id, actor.organizationId],
      );
    },
    async deliver(tx, actor, shipment, input) {
      await tx.query(
        "INSERT INTO logistics.deliveries(shipment_id,entry_id,organization_id,center_id,received_kg,delivered_at,evidence_ref,actor_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
        [
          shipment.id,
          shipment.stockEntryId,
          actor.organizationId,
          shipment.centerId,
          input.receivedKg,
          input.deliveredAt,
          input.evidenceRef,
          actor.id,
        ],
      );
    },
    async events(tx, actor, id, offset) {
      return (
        await tx.query(
          'SELECT id,kind,version,actor_id AS "actorId",occurred_at AS "occurredAt",payload FROM inventory.events WHERE shipment_id=$1 AND organization_id=$2 ORDER BY version LIMIT 100 OFFSET $3',
          [id, actor.organizationId, offset],
        )
      ).rows;
    },
    async entry(tx, actor, id, lock = "none") {
      const clause =
        lock === "update"
          ? " FOR UPDATE OF e"
          : lock === "share"
            ? " FOR SHARE OF e"
            : "";
      return (
        await tx.query(
          entrySelect + " WHERE e.id=$1 AND e.organization_id=$2" + clause,
          [id, actor.organizationId],
        )
      ).rows[0];
    },
    async entryForLot(tx, actor, lotId) {
      return (
        await tx.query(
          entrySelect + " WHERE e.lot_id=$1 AND e.organization_id=$2",
          [lotId, actor.organizationId],
        )
      ).rows[0];
    },
    async totals(tx, actor, id) {
      const rows = (
        await tx.query(
          "SELECT kind,sum(amount_kg)::text AS amount FROM inventory.movements WHERE entry_id=$1 AND organization_id=$2 GROUP BY kind",
          [id, actor.organizationId],
        )
      ).rows;
      return Object.fromEntries(rows.map((r) => [r.kind, r.amount]));
    },
    async admit(tx, actor, source, input) {
      const id = crypto.randomUUID();
      await tx.query(
        "INSERT INTO inventory.entries(id,lot_id,organization_id,center_id,admitted_kg,reference,evidence_ref,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
        [
          id,
          source.id,
          actor.organizationId,
          source.centerId,
          source.totalKg,
          input.reference,
          input.evidenceRef,
          actor.id,
        ],
      );
      return id;
    },
    async release(tx, actor, entry, quality, reason) {
      await tx.query(
        "UPDATE inventory.entries SET disposition='released',version=version+1,release_evaluation_id=$1,release_evaluation_version=$2,release_reason=$3,released_by=$4,released_at=clock_timestamp() WHERE id=$5 AND organization_id=$6",
        [
          quality.id,
          quality.version,
          reason,
          actor.id,
          entry.id,
          actor.organizationId,
        ],
      );
    },
    async advanceEntry(tx, actor, id) {
      await tx.query(
        "UPDATE inventory.entries SET version=version+1 WHERE id=$1 AND organization_id=$2",
        [id, actor.organizationId],
      );
    },
    async movement(
      tx,
      actor,
      entry,
      kind,
      shipmentId = null,
      occurredAt = null,
    ) {
      await tx.query(
        "INSERT INTO inventory.movements(id,entry_id,organization_id,center_id,shipment_id,kind,amount_kg,actor_id,occurred_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9::timestamptz,clock_timestamp()))",
        [
          crypto.randomUUID(),
          entry.id,
          actor.organizationId,
          entry.centerId,
          shipmentId,
          kind,
          entry.sourceKg,
          actor.id,
          occurredAt,
        ],
      );
    },
    async event(
      tx,
      actor,
      entry,
      before,
      after,
      kind,
      reason,
      shipmentId = null,
    ) {
      await tx.query(
        "INSERT INTO inventory.events(id,entry_id,shipment_id,organization_id,center_id,actor_id,kind,version,payload) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
        [
          crypto.randomUUID(),
          entry.id,
          shipmentId,
          actor.organizationId,
          entry.centerId,
          actor.id,
          kind,
          after.version,
          JSON.stringify({ before, after, reason: reason ?? null }),
        ],
      );
    },
    async movements(tx, actor, id, offset) {
      return (
        await tx.query(
          'SELECT id,shipment_id AS "shipmentId",kind,amount_kg::text AS "amountKg",actor_id AS "actorId",occurred_at AS "occurredAt",recorded_at AS "recordedAt" FROM inventory.movements WHERE entry_id=$1 AND organization_id=$2 ORDER BY recorded_at,id LIMIT 100 OFFSET $3',
          [id, actor.organizationId, offset],
        )
      ).rows;
    },
    async lockRequest(tx, actor, key) {
      await tx.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
        actor.id + ":logistics:" + key,
      ]);
    },
    async request(tx, actor, key) {
      return (
        await tx.query(
          "SELECT request_hash,response FROM inventory.requests WHERE actor_id=$1 AND organization_id=$2 AND request_key=$3",
          [actor.id, actor.organizationId, key],
        )
      ).rows[0];
    },
    async saveRequest(tx, actor, key, centerId, hash, item) {
      await tx.query(
        "INSERT INTO inventory.requests(actor_id,request_key,organization_id,center_id,request_hash,response) VALUES($1,$2,$3,$4,$5,$6)",
        [
          actor.id,
          key,
          actor.organizationId,
          centerId,
          hash,
          JSON.stringify(item),
        ],
      );
    },
  };
}
