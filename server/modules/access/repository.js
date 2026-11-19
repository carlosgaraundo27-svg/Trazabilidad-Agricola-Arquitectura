export function accessRepository() {
  return {
    async activeSession(tx, actor) {
      return (
        await tx.query(
          'SELECT u.id,u.organization_id AS "organizationId",u.role FROM access.users u JOIN access.sessions s ON s.user_id=u.id WHERE u.id=$1 AND u.organization_id=$2 AND u.active AND s.token_hash=$3 AND s.expires_at>clock_timestamp() FOR SHARE OF u,s',
          [actor.id, actor.organizationId, actor.sessionHash],
        )
      ).rows[0];
    },
    async centerGrant(tx, actor, centerId, action) {
      return (
        await tx.query(
          "SELECT g.action FROM access.center_grants g JOIN access.centers c ON c.id=g.center_id AND c.organization_id=g.organization_id JOIN access.users u ON u.id=g.user_id AND u.organization_id=g.organization_id JOIN access.sessions s ON s.user_id=u.id WHERE g.user_id=$1 AND g.organization_id=$2 AND g.center_id=$3 AND g.action=$4 AND u.active AND s.token_hash=$5 AND s.expires_at>now() FOR SHARE OF g,c,u,s",
          [actor.id, actor.organizationId, centerId, action, actor.sessionHash],
        )
      ).rows[0];
    },
    async centers(tx, actor) {
      return (
        await tx.query(
          "SELECT c.id,c.name,array_agg(g.action ORDER BY g.action) AS actions FROM access.centers c JOIN access.center_grants g ON g.center_id=c.id AND g.organization_id=c.organization_id WHERE g.user_id=$1 AND g.organization_id=$2 GROUP BY c.id,c.name ORDER BY c.id",
          [actor.id, actor.organizationId],
        )
      ).rows;
    },
    async findUser(tx, email) {
      return (
        await tx.query("SELECT * FROM access.users WHERE email=$1", [email])
      ).rows[0];
    },
    async saveSession(tx, hash, userId, csrf, expires) {
      await tx.query("DELETE FROM access.sessions WHERE expires_at <= now()");
      await tx.query("INSERT INTO access.sessions VALUES($1,$2,$3,$4)", [
        hash,
        userId,
        csrf,
        expires,
      ]);
    },
    async session(tx, hash) {
      return (
        await tx.query(
          'SELECT u.id,u.organization_id AS "organizationId",u.email,u.role,s.csrf_token AS "csrfToken" FROM access.sessions s JOIN access.users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now() AND u.active',
          [hash],
        )
      ).rows[0];
    },
    async logout(tx, hash) {
      await tx.query("DELETE FROM access.sessions WHERE token_hash=$1", [hash]);
    },
    async assignments(tx, actor, lock = false) {
      return (
        await tx.query(
          "SELECT parcel_id FROM access.parcel_assignments WHERE user_id=$1 AND organization_id=$2" +
            (lock ? " FOR SHARE" : ""),
          [actor.id, actor.organizationId],
        )
      ).rows.map((x) => x.parcel_id);
    },
    async audit(tx, actor, action, resource) {
      await tx.query(
        "INSERT INTO access.audit(id,actor_id,organization_id,action,resource_id,result) VALUES($1,$2,$3,$4,$5,$6)",
        [
          crypto.randomUUID(),
          actor.id,
          actor.organizationId,
          action,
          resource,
          "accepted",
        ],
      );
    },
  };
}
