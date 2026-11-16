import { connectDatabase } from "../server/db.js";
import { compose } from "../server/composition.js";
import { publicationLot, demoProjection } from "./publication-fixture.js";
import { publishInput } from "../server/modules/publication/domain.js";
if (
  process.env.NODE_ENV === "production" ||
  process.env.ALLOW_DEMO_SEED !== "true"
)
  throw new Error(
    "Solo usar en demostración ficticia preparada con ALLOW_DEMO_SEED=true.",
  );
const db = await connectDatabase();
try {
  const services = compose(db),
    lot = await publicationLot(services, process.env.DEMO_PASSWORD);
  let publication = {
    lotId: lot.id,
    state: "unpublished",
    projection: demoProjection,
  };
  if (process.argv.includes("--publish")) {
    const actor = await services.access.authenticate(
      (
        await services.access.login(
          "publicacion@example.test",
          process.env.DEMO_PASSWORD,
        )
      ).token,
    );
    publication = (
      await services.publication.publish(
        actor,
        lot.id,
        publishInput.parse({ expectedVersion: 0, ...demoProjection }),
        crypto.randomUUID(),
      )
    ).item;
  }
  console.log(JSON.stringify(publication, null, 2));
} finally {
  await db.close();
}
