import { hashPassword } from "../server/modules/access/password.js";
export const logisticsIds = {
  operator: "a0000000-0000-4000-8000-000000000001",
  operator2: "a0000000-0000-4000-8000-000000000002",
  foreign: "a0000000-0000-4000-8000-000000000003",
};
export const logisticsActions = [
  "inventory:read",
  "inventory:admit",
  "inventory:release",
  "shipment:read",
  "shipment:create",
  "shipment:update",
  "shipment:reserve",
  "shipment:dispatch",
  "shipment:deliver",
  "shipment:cancel",
];
export async function seedLogistics(db, password, { org, otherOrg }) {
  const hash = await hashPassword(password);
  await db.transaction(async (tx) => {
    for (const [id, organization, center, email] of [
      [
        logisticsIds.operator,
        org,
        "60000000-0000-4000-8000-000000000001",
        "inventario@example.test",
      ],
      [
        logisticsIds.operator2,
        org,
        "60000000-0000-4000-8000-000000000002",
        "inventario2@example.test",
      ],
      [
        logisticsIds.foreign,
        otherOrg,
        "60000000-0000-4000-8000-000000000003",
        "inventario-ajeno@example.test",
      ],
    ]) {
      await tx.query(
        "INSERT INTO access.users(id,organization_id,email,password_hash,role) VALUES($1,$2,$3,$4,'viewer') ON CONFLICT DO NOTHING",
        [id, organization, email, hash],
      );
      for (const action of logisticsActions)
        await tx.query(
          "INSERT INTO access.center_grants VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING",
          [id, center, organization, action],
        );
    }
  });
}
