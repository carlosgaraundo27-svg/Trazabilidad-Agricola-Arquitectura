import { hashPassword } from "../server/modules/access/password.js";
export const qualityIds = {
  responsible: "80000000-0000-4000-8000-000000000001",
  responsible2: "80000000-0000-4000-8000-000000000002",
  otherResponsible: "80000000-0000-4000-8000-000000000003",
};
export async function seedQuality(db, password, { org, otherOrg }) {
  const hash = await hashPassword(password);
  await db.transaction(async (tx) => {
    for (const [id, organization, center, email] of [
      [
        qualityIds.responsible,
        org,
        "60000000-0000-4000-8000-000000000001",
        "calidad@example.test",
      ],
      [
        qualityIds.responsible2,
        org,
        "60000000-0000-4000-8000-000000000002",
        "calidad2@example.test",
      ],
      [
        qualityIds.otherResponsible,
        otherOrg,
        "60000000-0000-4000-8000-000000000003",
        "calidad-ajena@example.test",
      ],
    ]) {
      await tx.query(
        "INSERT INTO access.users(id,organization_id,email,password_hash,role) VALUES($1,$2,$3,$4,'viewer') ON CONFLICT DO NOTHING",
        [id, organization, email, hash],
      );
      for (const action of [
        "quality:read",
        "quality:create",
        "quality:update",
        "quality:close",
      ])
        await tx.query(
          "INSERT INTO access.center_grants VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING",
          [id, center, organization, action],
        );
    }
  });
}
