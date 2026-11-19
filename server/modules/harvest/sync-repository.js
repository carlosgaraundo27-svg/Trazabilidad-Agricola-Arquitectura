export function harvestSyncRepository() {
  return {
    async lock(tx, actor, id) {
      await tx.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
        "harvest-sync:" + actor.organizationId + ":" + id,
      ]);
    },
    async receipt(tx, actor, id) {
      return (
        await tx.query(
          "SELECT actor_id,payload_hash,payload,result FROM harvest.sync_receipts WHERE organization_id=$1 AND client_capture_id=$2",
          [actor.organizationId, id],
        )
      ).rows[0];
    },
    async save(tx, actor, id, input, digest, result) {
      await tx.query(
        "INSERT INTO harvest.sync_receipts(organization_id,client_capture_id,actor_id,pre_lot_id,harvest_id,schema_version,payload_hash,payload,result,accepted_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
        [
          actor.organizationId,
          id,
          actor.id,
          result.preLotId,
          result.harvestId,
          input.schemaVersion,
          digest,
          JSON.stringify(input),
          JSON.stringify(result),
          result.acceptedAt,
        ],
      );
    },
  };
}
