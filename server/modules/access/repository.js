export function accessRepository() {
  return {
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
