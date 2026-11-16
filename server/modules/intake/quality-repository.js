const select = `SELECT e.id,e.lot_id AS "lotId",e.organization_id AS "organizationId",e.center_id AS "centerId",e.state AS "evaluationState",e.version,e.capture,e.result AS "qualityResult",e.note,e.created_by AS "createdBy",e.created_at AS "createdAt",e.updated_by AS "updatedBy",e.updated_at AS "updatedAt",e.closed_by AS "closedBy",e.closed_at AS "closedAt" FROM quality.evaluations e`;
export function qualityRepository() {
  return {
    async eligibility(tx, actor, lotId) {
      return (
        (
          await tx.query(
            'SELECT id,version,state AS "evaluationState",result AS "qualityResult" FROM quality.evaluations WHERE lot_id=$1 AND organization_id=$2 FOR SHARE',
            [lotId, actor.organizationId],
          )
        ).rows[0] ?? null
      );
    },
    async get(tx, actor, id, lock = "none") {
      let lockClause = "";
      if (lock === "update") lockClause = " FOR UPDATE OF e";
      if (lock === "share") lockClause = " FOR SHARE OF e";
      return (
        await tx.query(
          select + " WHERE e.organization_id=$1 AND e.id=$2" + lockClause,
          [actor.organizationId, id],
        )
      ).rows[0];
    },
    async projection(tx, actor, centerId, ids) {
      return (
        await tx.query(
          select +
            " WHERE e.organization_id=$1 AND e.center_id=$2 AND e.lot_id=ANY($3::uuid[])",
          [actor.organizationId, centerId, ids],
        )
      ).rows;
    },
    async events(tx, actor, id) {
      return (
        await tx.query(
          'SELECT id,kind,version,actor_id AS "actorId",occurred_at AS "occurredAt",payload FROM quality.events WHERE organization_id=$1 AND evaluation_id=$2 ORDER BY version',
          [actor.organizationId, id],
        )
      ).rows;
    },
    async create(tx, actor, lot, capture) {
      const id = crypto.randomUUID();
      await tx.query(
        "INSERT INTO quality.evaluations(id,lot_id,organization_id,center_id,capture,created_by,updated_by) VALUES($1,$2,$3,$4,$5,$6,$6)",
        [
          id,
          lot.id,
          actor.organizationId,
          lot.centerId,
          JSON.stringify(capture),
          actor.id,
        ],
      );
      return id;
    },
    async update(tx, actor, id, capture) {
      await tx.query(
        "UPDATE quality.evaluations SET capture=$1,version=version+1,updated_by=$2,updated_at=clock_timestamp() WHERE id=$3 AND organization_id=$4",
        [JSON.stringify(capture), actor.id, id, actor.organizationId],
      );
    },
    async close(tx, actor, id, input) {
      await tx.query(
        "UPDATE quality.evaluations SET state='closed',version=version+1,result=$1,note=$2,closed_by=$3,closed_at=clock_timestamp(),updated_by=$3,updated_at=clock_timestamp() WHERE id=$4 AND organization_id=$5",
        [input.result, input.note, actor.id, id, actor.organizationId],
      );
    },
    async event(tx, actor, before, after, kind, receiptTemperatures) {
      await tx.query(
        "INSERT INTO quality.events(id,evaluation_id,organization_id,actor_id,kind,version,payload) VALUES($1,$2,$3,$4,$5,$6,$7)",
        [
          crypto.randomUUID(),
          after.id,
          actor.organizationId,
          actor.id,
          kind,
          after.version,
          JSON.stringify({
            before,
            after,
            ...(receiptTemperatures ? { receiptTemperatures } : {}),
          }),
        ],
      );
    },
    async lockRequest(tx, actor, key) {
      await tx.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
        actor.id + ":quality:" + key,
      ]);
    },
    async request(tx, actor, key) {
      return (
        await tx.query(
          "SELECT request_hash,response FROM quality.requests WHERE actor_id=$1 AND organization_id=$2 AND request_key=$3",
          [actor.id, actor.organizationId, key],
        )
      ).rows[0];
    },
    async saveRequest(tx, actor, key, centerId, hash, response) {
      await tx.query(
        "INSERT INTO quality.requests(actor_id,request_key,organization_id,center_id,request_hash,response) VALUES($1,$2,$3,$4,$5,$6)",
        [
          actor.id,
          key,
          actor.organizationId,
          centerId,
          hash,
          JSON.stringify(response),
        ],
      );
    },
  };
}
