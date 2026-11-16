import { hashPassword } from "../server/modules/access/password.js";
export const publicationIds = {
  owner: "90000000-0000-4000-8000-000000000001",
  otherCenter: "90000000-0000-4000-8000-000000000002",
  otherOrganization: "90000000-0000-4000-8000-000000000003",
};
export async function seedPublication(db, password, { org, otherOrg }) {
  const hash = await hashPassword(password);
  await db.transaction(async (tx) => {
    for (const [id, organization, center, email] of [
      [
        publicationIds.owner,
        org,
        "60000000-0000-4000-8000-000000000001",
        "publicacion@example.test",
      ],
      [
        publicationIds.otherCenter,
        org,
        "60000000-0000-4000-8000-000000000002",
        "publicacion2@example.test",
      ],
      [
        publicationIds.otherOrganization,
        otherOrg,
        "60000000-0000-4000-8000-000000000003",
        "publicacion-ajena@example.test",
      ],
    ]) {
      await tx.query(
        "INSERT INTO access.users(id,organization_id,email,password_hash,role) VALUES($1,$2,$3,$4,'viewer') ON CONFLICT DO NOTHING",
        [id, organization, email, hash],
      );
      for (const action of [
        "publication:read",
        "publication:publish",
        "publication:withdraw",
      ])
        await tx.query(
          "INSERT INTO access.center_grants VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING",
          [id, center, organization, action],
        );
    }
  });
}
