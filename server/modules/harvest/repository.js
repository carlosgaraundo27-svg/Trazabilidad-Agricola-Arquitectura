const select =
  'SELECT p.id,p.harvest_id AS "harvestId",h.parcel_id AS "parcelId",h.harvested_at AS "harvestedAt",h.quantity::text AS quantity,h.unit,p.status,p.actor_id AS "createdBy",p.created_at AS "createdAt" FROM harvest.pre_lots p JOIN harvest.harvests h ON h.id=p.harvest_id';
export function harvestRepository() {
  return {
    async lockKey(tx, actor, key) {
      await tx.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
        actor.id + key,
      ]);
    },
    async findRequest(tx, actor, key) {
      return (
        await tx.query(
          "SELECT id,request_payload FROM harvest.pre_lots WHERE actor_id=$1 AND request_key=$2",
          [actor.id, key],
        )
      ).rows[0];
    },
    async get(tx, id) {
      return (await tx.query(select + " WHERE p.id=$1", [id])).rows[0];
    },
    async create(tx, actor, input, key) {
      const harvestId = crypto.randomUUID(),
        id = crypto.randomUUID();
      await tx.query(
        "INSERT INTO harvest.harvests(id,organization_id,parcel_id,harvested_at,quantity,unit,actor_id) VALUES($1,$2,$3,$4,$5,$6,$7)",
        [
          harvestId,
          actor.organizationId,
          input.parcelId,
          input.harvestedAt,
          input.quantity,
          input.unit,
          actor.id,
        ],
      );
      await tx.query(
        "INSERT INTO harvest.pre_lots(id,harvest_id,organization_id,actor_id,request_key,request_payload) VALUES($1,$2,$3,$4,$5,$6)",
        [
          id,
          harvestId,
          actor.organizationId,
          actor.id,
          key,
          JSON.stringify(input),
        ],
      );
      return this.get(tx, id);
    },
    async list(tx, actor, ids, offset) {
      return (
        await tx.query(
          select +
            " WHERE p.organization_id=$1 AND h.parcel_id=ANY($2::uuid[]) ORDER BY p.id LIMIT 100 OFFSET $3",
          [actor.organizationId, ids, offset],
        )
      ).rows;
    },
  };
}
