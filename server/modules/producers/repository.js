export function producersRepository() {
  return {
    async createProducer(tx, actor, input) {
      return (
        await tx.query(
          'INSERT INTO producers.producers(id,organization_id,name) VALUES($1,$2,$3) RETURNING id,name,created_at AS "createdAt"',
          [crypto.randomUUID(), actor.organizationId, input.name],
        )
      ).rows[0];
    },
    async findProducer(tx, actor, id) {
      return (
        await tx.query(
          "SELECT id FROM producers.producers WHERE id=$1 AND organization_id=$2",
          [id, actor.organizationId],
        )
      ).rows[0];
    },
    async createParcel(tx, actor, input) {
      return (
        await tx.query(
          'INSERT INTO producers.parcels(id,organization_id,producer_id,name,latitude,longitude) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,producer_id AS "producerId",name,latitude,longitude,created_at AS "createdAt"',
          [
            crypto.randomUUID(),
            actor.organizationId,
            input.producerId,
            input.name,
            input.latitude,
            input.longitude,
          ],
        )
      ).rows[0];
    },
    async findParcel(tx, actor, id) {
      return (
        await tx.query(
          'SELECT id,producer_id AS "producerId" FROM producers.parcels WHERE id=$1 AND organization_id=$2',
          [id, actor.organizationId],
        )
      ).rows[0];
    },
    async listProducers(tx, actor, ids, offset) {
      return (
        await tx.query(
          'SELECT p.id,p.name,p.created_at AS "createdAt" FROM producers.producers p WHERE p.organization_id=$1 AND ($2::boolean OR EXISTS(SELECT 1 FROM producers.parcels r WHERE r.producer_id=p.id AND r.id=ANY($3::uuid[]))) ORDER BY p.id LIMIT 100 OFFSET $4',
          [actor.organizationId, actor.role === "admin", ids, offset],
        )
      ).rows;
    },
    async listParcels(tx, actor, ids, offset) {
      return (
        await tx.query(
          'SELECT id,producer_id AS "producerId",name,latitude,longitude,created_at AS "createdAt" FROM producers.parcels WHERE organization_id=$1 AND ($2::boolean OR id=ANY($3::uuid[])) ORDER BY id LIMIT 100 OFFSET $4',
          [actor.organizationId, actor.role === "admin", ids, offset],
        )
      ).rows;
    },
  };
}
