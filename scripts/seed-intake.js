import { hashPassword } from "../server/modules/access/password.js";
export const intakeIds = {
  center: "60000000-0000-4000-8000-000000000001",
  center2: "60000000-0000-4000-8000-000000000002",
  otherCenter: "60000000-0000-4000-8000-000000000003",
  operator: "70000000-0000-4000-8000-000000000001",
  reviewer: "70000000-0000-4000-8000-000000000002",
  operator2: "70000000-0000-4000-8000-000000000003",
  dual: "70000000-0000-4000-8000-000000000004",
  otherOperator: "70000000-0000-4000-8000-000000000005",
};
export async function seedIntake(db, password, { org, otherOrg }) {
  const hash = await hashPassword(password);
  const normal = [
    "intake:read",
    "intake:receive",
    "intake:confirm",
    "lot:consolidate",
  ];
  await db.transaction(async (tx) => {
    for (const [id, organization, name] of [
      [intakeIds.center, org, "Acopio ficticio Norte"],
      [intakeIds.center2, org, "Acopio ficticio Sur"],
      [intakeIds.otherCenter, otherOrg, "Acopio ficticio ajeno"],
    ])
      await tx.query(
        "INSERT INTO access.centers VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
        [id, organization, name],
      );
    for (const [id, organization, email, center, actions] of [
      [
        intakeIds.operator,
        org,
        "acopio@example.test",
        intakeIds.center,
        normal,
      ],
      [
        intakeIds.reviewer,
        org,
        "responsable@example.test",
        intakeIds.center,
        ["intake:read", "intake:review"],
      ],
      [
        intakeIds.operator2,
        org,
        "acopio2@example.test",
        intakeIds.center2,
        normal,
      ],
      [
        intakeIds.dual,
        org,
        "doble@example.test",
        intakeIds.center,
        [...normal, "intake:review"],
      ],
      [
        intakeIds.otherOperator,
        otherOrg,
        "acopio-ajeno@example.test",
        intakeIds.otherCenter,
        normal,
      ],
    ]) {
      await tx.query(
        "INSERT INTO access.users(id,organization_id,email,password_hash,role) VALUES($1,$2,$3,$4,'viewer') ON CONFLICT DO NOTHING",
        [id, organization, email, hash],
      );
      for (const action of actions)
        await tx.query(
          "INSERT INTO access.center_grants VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING",
          [id, center, organization, action],
        );
    }
  });
}
