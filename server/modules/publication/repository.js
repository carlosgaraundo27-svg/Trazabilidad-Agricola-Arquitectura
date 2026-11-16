const select =
  'SELECT lot_id AS "lotId", public_id AS "publicId",state,version,content,content_hash AS "contentHash" FROM publication.lots';
export function publicationRepository() {
  return {
    async get(tx, lotId) {
      return (await tx.query(select + " WHERE lot_id=$1", [lotId])).rows[0];
    },
    async publicGate(tx, id) {
      return (
        await tx.query(
          'SELECT public_id AS "publicId",state,version,content_hash AS "contentHash" FROM publication.lots WHERE public_id=$1 FOR SHARE',
          [id],
        )
      ).rows[0];
    },
    async snapshot(tx, id, version) {
      return (
        await tx.query(
          "SELECT content FROM publication.lots WHERE public_id=$1 AND version=$2 AND state='published'",
          [id, version],
        )
      ).rows[0]?.content;
    },
    async save(tx, actor, lot, next) {
      await tx.query(
        "INSERT INTO publication.lots(lot_id,organization_id,center_id,public_id,state,version,content,content_hash,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(lot_id) DO UPDATE SET state=EXCLUDED.state,version=EXCLUDED.version,content=EXCLUDED.content,content_hash=EXCLUDED.content_hash,updated_by=EXCLUDED.updated_by,updated_at=clock_timestamp()",
        [
          lot.id,
          actor.organizationId,
          lot.centerId,
          next.publicId,
          next.state,
          next.version,
          JSON.stringify(next.content),
          next.contentHash,
          actor.id,
        ],
      );
      await tx.query(
        "INSERT INTO publication.history(lot_id,version,state,content,actor_id,organization_id) VALUES($1,$2,$3,$4,$5,$6)",
        [
          lot.id,
          next.version,
          next.state,
          JSON.stringify(next.content),
          actor.id,
          actor.organizationId,
        ],
      );
    },
    async history(tx, actor, lotId) {
      return (
        await tx.query(
          'SELECT version,state,content,actor_id AS "actorId",occurred_at AS "occurredAt" FROM publication.history WHERE lot_id=$1 AND organization_id=$2 ORDER BY version',
          [lotId, actor.organizationId],
        )
      ).rows;
    },
    async lockRequest(tx, actor, key) {
      await tx.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
        actor.id + ":publication:" + key,
      ]);
    },
    async request(tx, actor, key) {
      return (
        await tx.query(
          "SELECT request_hash,response FROM publication.requests WHERE actor_id=$1 AND organization_id=$2 AND request_key=$3",
          [actor.id, actor.organizationId, key],
        )
      ).rows[0];
    },
    async saveRequest(tx, actor, key, hash, item) {
      await tx.query(
        "INSERT INTO publication.requests(actor_id,request_key,organization_id,request_hash,response) VALUES($1,$2,$3,$4,$5)",
        [actor.id, key, actor.organizationId, hash, JSON.stringify(item)],
      );
    },
  };
}
