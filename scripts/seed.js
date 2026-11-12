import { pathToFileURL } from "node:url";
import { connectDatabase } from "../server/db.js";
import { hashPassword } from "../server/modules/access/password.js";
export const ids = {
  org: "10000000-0000-4000-8000-000000000001",
  otherOrg: "10000000-0000-4000-8000-000000000002",
  admin: "20000000-0000-4000-8000-000000000001",
  collector: "20000000-0000-4000-8000-000000000002",
  otherCollector: "20000000-0000-4000-8000-000000000003",
  viewer: "20000000-0000-4000-8000-000000000004",
  producer: "30000000-0000-4000-8000-000000000001",
  otherProducer: "30000000-0000-4000-8000-000000000002",
  parcel: "40000000-0000-4000-8000-000000000001",
  unassigned: "40000000-0000-4000-8000-000000000002",
  otherParcel: "40000000-0000-4000-8000-000000000003",
};
export async function seed(db, password) {
  if (!password || password.length < 12)
    throw Error("DEMO_PASSWORD debe tener al menos 12 caracteres.");
  const hash = await hashPassword(password);
  await db.transaction(async (tx) => {
    for (const [id, name] of [
      [ids.org, "Cooperativa ficticia Valle Verde"],
      [ids.otherOrg, "Organización ficticia de aislamiento"],
    ])
      await tx.query(
        "INSERT INTO access.organizations VALUES($1,$2) ON CONFLICT DO NOTHING",
        [id, name],
      );
    for (const [id, org, email, role] of [
      [ids.admin, ids.org, "admin@example.test", "admin"],
      [ids.collector, ids.org, "campo@example.test", "collector"],
      [ids.otherCollector, ids.otherOrg, "otro@example.test", "collector"],
      [ids.viewer, ids.org, "lector@example.test", "viewer"],
    ])
      await tx.query(
        "INSERT INTO access.users(id,organization_id,email,password_hash,role) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING",
        [id, org, email, hash, role],
      );
    for (const [id, org, name] of [
      [ids.producer, ids.org, "Productora ficticia Ana del Valle"],
      [ids.otherProducer, ids.otherOrg, "Productor ficticio ajeno"],
    ])
      await tx.query(
        "INSERT INTO producers.producers(id,organization_id,name) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
        [id, org, name],
      );
    for (const [id, org, producer, name] of [
      [ids.parcel, ids.org, ids.producer, "Parcela demo Norte"],
      [ids.unassigned, ids.org, ids.producer, "Parcela demo sin asignar"],
      [
        ids.otherParcel,
        ids.otherOrg,
        ids.otherProducer,
        "Parcela de otro ámbito",
      ],
    ])
      await tx.query(
        "INSERT INTO producers.parcels(id,organization_id,producer_id,name,latitude,longitude) VALUES($1,$2,$3,$4,-12.1,-76.9) ON CONFLICT DO NOTHING",
        [id, org, producer, name],
      );
    for (const [user, parcel, org] of [
      [ids.collector, ids.parcel, ids.org],
      [ids.otherCollector, ids.otherParcel, ids.otherOrg],
    ])
      await tx.query(
        "INSERT INTO access.parcel_assignments VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
        [user, parcel, org],
      );
  });
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.ALLOW_DEMO_SEED !== "true"
  )
    throw Error("Seed requiere ALLOW_DEMO_SEED=true y entorno no productivo.");
  const db = await connectDatabase();
  try {
    await seed(db, process.env.DEMO_PASSWORD);
    console.log("Seed ficticio aplicado; cuentas existentes conservadas.");
  } finally {
    await db.close();
  }
}
