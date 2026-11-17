import { test } from "node:test";
import assert from "node:assert/strict";
import { connectDatabase } from "../../server/db.js";
import { compose } from "../../server/composition.js";
import { createApp } from "../../server/http.js";
import { migrate } from "../../scripts/migrate.js";
import { seed } from "../../scripts/seed.js";
import { logisticsLot } from "../../scripts/logistics-fixture.js";
import { logisticsIds } from "../../scripts/seed-logistics.js";
import { intakeIds } from "../../scripts/seed-intake.js";
import { demoProjection } from "../../scripts/publication-fixture.js";

test("Inventario y despacho HTTP/PostgreSQL conservan masa y autorización", async (t) => {
  if (process.env.TEST_ALLOW_DB_WRITE !== "true")
    throw Error("Base desechable requerida");
  const db = await connectDatabase();
  await migrate(db);
  await seed(db, "Fiction-only-2026!");
  const services = compose(db, { baseUrl: "https://public.example.test" });
  const server = createApp({ db, services, log: () => {} }).listen(
    0,
    "127.0.0.1",
  );
  await new Promise((r) => server.once("listening", r));
  t.after(async () => {
    await new Promise((r) => server.close(r));
    await db.close();
  });
  const base = "http://127.0.0.1:" + server.address().port + "/api/v1";
  const call = async (path, method = "GET", body, auth = {}, key) => {
    const r = await fetch(base + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(auth.cookie
          ? { Cookie: auth.cookie, "X-CSRF-Token": auth.csrf }
          : {}),
        ...(key ? { "Idempotency-Key": key } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return {
      status: r.status,
      body: await r.json(),
      cookie: r.headers.get("set-cookie")?.split(";")[0],
    };
  };
  const login = async (email) => {
    const r = await call("/auth/login", "POST", {
      email,
      password: "Fiction-only-2026!",
    });
    assert.equal(r.status, 200);
    return { cookie: r.cookie, csrf: r.body.csrfToken };
  };
  const owner = await login("inventario@example.test");
  const command = (
    path,
    body,
    auth = owner,
    key = crypto.randomUUID(),
    method = "POST",
  ) => call(path, method, body, auth, key);
  const lot = await logisticsLot(services, "Fiction-only-2026!");
  const transport = (guide = "DEMO-" + crypto.randomUUID()) => ({
    guideReference: guide,
    vehicleLabel: "Unidad ficticia",
    plate: "DEMO-001",
    driverName: "Chofer privado ficticio",
    sealReference: "SELLO-PRIVADO",
  });
  const admit = async (candidate) => {
    const r = await command("/inventory/entries", {
      lotId: candidate.id,
      verifiedKg: candidate.totalKg,
      reference: "ACTUAL",
      evidenceRef: "Conteo actual ficticio",
    });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    return r.body;
  };
  const entryNow = async (id) =>
    (await call("/inventory/entries/" + id, "GET", undefined, owner)).body;
  const shipmentNow = async (id) =>
    (await call("/shipments/" + id, "GET", undefined, owner)).body;
  const versionInput = (shipment) => ({
    expectedVersion: shipment.version,
    expectedInventoryVersion: shipment.inventory.version,
  });
  const prepare = async (stage = "draft", result = "accepted") => {
    const candidate = await logisticsLot(services, "Fiction-only-2026!", {
      result,
    });
    let entry = await admit(candidate);
    if (stage === "admitted") return { lot: candidate, entry };
    const release = await command(`/inventory/entries/${entry.id}/release`, {
      expectedVersion: entry.version,
      reason: "Liberación explícita ficticia",
    });
    assert.equal(release.status, 201, JSON.stringify(release.body));
    entry = release.body;
    if (stage === "released") return { lot: candidate, entry };
    const r = await command("/shipments", {
      stockEntryId: entry.id,
      transport: transport(),
      destinationLabel: "Destino privado ficticio",
    });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    let shipment = r.body;
    // Start synthetic events after the DB-created instant, before arranging the race.
    // Windows processes may sample wall time at different millisecond ticks.
    const creationTime = Date.parse(shipment.createdAt),
      clockDeadline = Date.now() + 1000;
    while (Date.now() < creationTime) {
      assert.ok(
        Date.now() < clockDeadline,
        "El reloj del fixture debe alcanzar la creación registrada",
      );
      await new Promise((resolve) => setTimeout(resolve, 1));
    }
    if (stage === "reserved" || stage === "in_transit") {
      const r = await command(
        `/shipments/${shipment.id}/reservation`,
        versionInput(shipment),
      );
      assert.equal(r.status, 201, JSON.stringify(r.body));
      shipment = r.body;
    }
    if (stage === "in_transit") {
      const r = await command(`/shipments/${shipment.id}/departure`, {
        ...versionInput(shipment),
        departedAt: new Date().toISOString(),
      });
      assert.equal(r.status, 201, JSON.stringify(r.body));
      shipment = r.body;
    }
    return { lot: candidate, entry: shipment.inventory, shipment };
  };
  const race = async (lotId, tasks) => {
    let unlock, ready;
    const readyPromise = new Promise((r) => {
      ready = r;
    });
    const held = db.transaction(async (tx) => {
      await tx.query(
        "SELECT id FROM traceability.lots WHERE id=$1 FOR UPDATE",
        [lotId],
      );
      ready();
      await new Promise((r) => {
        unlock = r;
      });
    });
    await readyPromise;
    const pending = tasks.map((fn) => fn());
    try {
      let blocked = 0;
      const end = Date.now() + 5000;
      while (Date.now() < end) {
        blocked = Number(
          (
            await db.query(
              "SELECT count(*) AS n FROM pg_stat_activity WHERE wait_event_type='Lock' AND (query LIKE '%traceability.lots%' OR query LIKE '%inventory.entries%')",
            )
          ).rows[0].n,
        );
        if (blocked >= tasks.length) break;
        await new Promise((r) => setTimeout(r, 10));
      }
      assert.ok(
        blocked >= tasks.length,
        "ambos comandos alcanzaron el bloqueo PostgreSQL",
      );
    } finally {
      unlock();
      await held;
    }
    return Promise.all(pending);
  };
  await t.test(
    "instantes de salida y entrega conservan milisegundos de la API sin truncamiento oculto",
    async () => {
      const f = await prepare("reserved"),
        path = `/shipments/${f.shipment.id}`;
      let r = await command(path + "/departure", {
        ...versionInput(f.shipment),
        departedAt: "2026-01-02T20:00:00.123456Z",
      });
      assert.equal(r.status, 422);
      const beforePreparation = await command(path + "/departure", {
        ...versionInput(f.shipment),
        departedAt: new Date(
          Date.parse(f.shipment.createdAt) - 1,
        ).toISOString(),
      });
      assert.equal(beforePreparation.status, 422);
      assert.equal(beforePreparation.body.error.code, "DEPARTURE_TIME");
      r = await command(path + "/departure", {
        ...versionInput(f.shipment),
        departedAt: f.shipment.createdAt,
      });
      assert.equal(r.status, 201, JSON.stringify(r.body));
      const delivered = await command(path + "/delivery", {
        ...versionInput(r.body),
        receivedKg: r.body.quantityKg,
        deliveredAt: r.body.departedAt,
        evidenceRef: "Recepción ficticia en el mismo milisegundo",
      });
      assert.equal(delivered.status, 201, JSON.stringify(delivered.body));
    },
  );
  await t.test(
    "guía normalizada no se reutiliza tras corrección ni cancelación",
    async () => {
      const first = await prepare(),
        second = await prepare();
      const guide = "HIST-" + crypto.randomUUID();
      let r = await command(
        `/shipments/${first.shipment.id}/transport`,
        {
          expectedVersion: first.shipment.version,
          transport: transport(guide),
          destinationLabel: "Destino",
          reason: "Primera referencia",
        },
        owner,
        crypto.randomUUID(),
        "PUT",
      );
      assert.equal(r.status, 200, JSON.stringify(r.body));
      r = await command(
        `/shipments/${first.shipment.id}/transport`,
        {
          expectedVersion: r.body.version,
          transport: transport(guide + "-CORREGIDA"),
          destinationLabel: "Destino",
          reason: "Corrección con historia",
        },
        owner,
        crypto.randomUUID(),
        "PUT",
      );
      assert.equal(r.status, 200);
      const duplicate = await command(
        `/shipments/${second.shipment.id}/transport`,
        {
          expectedVersion: second.shipment.version,
          transport: transport(" " + guide.toLowerCase() + " "),
          destinationLabel: "Destino",
          reason: "Intento reutilización",
        },
        owner,
        crypto.randomUUID(),
        "PUT",
      );
      assert.equal(duplicate.status, 409, JSON.stringify(duplicate.body));
      assert.equal(duplicate.body.error.code, "GUIDE_REFERENCE_CONFLICT");
      r = await command(`/shipments/${first.shipment.id}/cancellation`, {
        ...versionInput(r.body),
        reason: "Cancelación previa",
      });
      assert.equal(r.status, 201);
      const old = await command(
        `/shipments/${second.shipment.id}/transport`,
        {
          expectedVersion: second.shipment.version,
          transport: transport(guide + "-CORREGIDA"),
          destinationLabel: "Destino",
          reason: "Guía de cancelado",
        },
        owner,
        crypto.randomUUID(),
        "PUT",
      );
      assert.equal(old.status, 409);
    },
  );
  await t.test(
    "doble admisión y replay concurrentes conservan un solo ingreso",
    async () => {
      const candidate = await logisticsLot(services, "Fiction-only-2026!");
      const input = {
        lotId: candidate.id,
        verifiedKg: candidate.totalKg,
        reference: "DOBLE",
        evidenceRef: "Conteo físico",
      };
      const results = await race(candidate.id, [
        () => command("/inventory/entries", input),
        () => command("/inventory/entries", input),
      ]);
      assert.deepEqual(
        results.map((r) => r.status).sort((a, b) => a - b),
        [201, 409],
      );
      const entry = results.find((r) => r.status === 201).body;
      assert.equal((await entryNow(entry.id)).admittedKg, "73.125");
      const another = await logisticsLot(services, "Fiction-only-2026!"),
        key = crypto.randomUUID(),
        body = { ...input, lotId: another.id };
      const same = await Promise.all([
        command("/inventory/entries", body, owner, key),
        command("/inventory/entries", body, owner, key),
      ]);
      assert.deepEqual(
        same.map((r) => r.status).sort((a, b) => a - b),
        [200, 201],
      );
      assert.deepEqual(same[0].body, same[1].body);
    },
  );
  await t.test(
    "calidad pendiente, draft, observada y rechazada impiden liberar; accepted no autoriza solo",
    async () => {
      for (const result of [null, "draft", "observed", "rejected"]) {
        const candidate = await logisticsLot(services, "Fiction-only-2026!", {
          result,
        });
        const entry = await admit(candidate);
        const denied = await command(`/inventory/entries/${entry.id}/release`, {
          expectedVersion: entry.version,
          reason: "Intento",
        });
        assert.equal(denied.status, 422);
        assert.equal(denied.body.error.code, "QUALITY_NOT_APPROVED");
        assert.equal((await entryNow(entry.id)).onHandKg, "73.125");
      }
      const { entry } = await prepare("admitted");
      const r = await command("/shipments", { stockEntryId: entry.id });
      assert.equal(r.status, 201);
      const denied = await command(
        `/shipments/${r.body.id}/reservation`,
        versionInput(r.body),
      );
      assert.equal(denied.status, 422);
      assert.equal(denied.body.error.code, "INVENTORY_NOT_RELEASED");
    },
  );
  await t.test(
    "dos reservas distintas, stock insuficiente y cancelación liberan exactamente el saldo",
    async () => {
      const f = await prepare(),
        other = await command("/shipments", { stockEntryId: f.entry.id });
      assert.equal(other.status, 201);
      const results = await race(f.lot.id, [
        () =>
          command(
            `/shipments/${f.shipment.id}/reservation`,
            versionInput(f.shipment),
          ),
        () =>
          command(
            `/shipments/${other.body.id}/reservation`,
            versionInput(other.body),
          ),
      ]);
      assert.deepEqual(
        results.map((r) => r.status).sort((a, b) => a - b),
        [201, 409],
      );
      const winner = results.find((r) => r.status === 201).body;
      const loser = await shipmentNow(
        results[0].status === 409 ? f.shipment.id : other.body.id,
      );
      const insufficient = await command(
        `/shipments/${loser.id}/reservation`,
        versionInput(loser),
      );
      assert.equal(insufficient.status, 409);
      assert.equal(insufficient.body.error.code, "STOCK_INSUFFICIENT");
      const cancelled = await command(`/shipments/${winner.id}/cancellation`, {
        ...versionInput(winner),
        reason: "Reserva abandonada",
      });
      assert.equal(cancelled.status, 201);
      assert.equal(cancelled.body.inventory.onHandKg, "73.125");
      assert.equal(cancelled.body.inventory.reservedKg, "0.000");
      const updated = await shipmentNow(loser.id);
      assert.equal(
        (
          await command(
            `/shipments/${updated.id}/reservation`,
            versionInput(updated),
          )
        ).status,
        201,
      );
    },
  );
  await t.test(
    "doble salida y salida contra cancelación tienen un solo ganador",
    async () => {
      for (const cancel of [false, true]) {
        const f = await prepare("reserved"),
          path = `/shipments/${f.shipment.id}`,
          body = versionInput(f.shipment);
        const results = await race(f.lot.id, [
          () =>
            command(path + "/departure", {
              ...body,
              departedAt: new Date().toISOString(),
            }),
          () =>
            cancel
              ? command(path + "/cancellation", { ...body, reason: "Cancelar" })
              : command(path + "/departure", {
                  ...body,
                  departedAt: new Date().toISOString(),
                }),
        ]);
        assert.deepEqual(
          results.map((r) => r.status).sort((a, b) => a - b),
          [201, 409],
        );
        const current = await shipmentNow(f.shipment.id);
        assert.ok(["in_transit", "cancelled"].includes(current.state));
        assert.equal(current.inventory.reservedKg, "0.000");
        assert.equal(
          current.inventory.onHandKg,
          current.state === "cancelled" ? "73.125" : "0.000",
        );
      }
    },
  );
  await t.test(
    "entrega distinta o prematura no fabrica pérdidas; dos confirmaciones no duplican entrega",
    async () => {
      const f = await prepare("in_transit"),
        path = `/shipments/${f.shipment.id}`,
        body = {
          ...versionInput(f.shipment),
          receivedKg: "73.125",
          deliveredAt: new Date().toISOString(),
          evidenceRef: "Recepción ficticia",
        };
      for (const changes of [
        { receivedKg: "70.000" },
        { deliveredAt: "2020-01-01T00:00:00Z" },
        { deliveredAt: "2999-01-01T00:00:00Z" },
        { evidenceRef: "" },
      ])
        assert.equal(
          (await command(path + "/delivery", { ...body, ...changes })).status,
          422,
        );
      assert.equal((await entryNow(f.entry.id)).inTransitKg, "73.125");
      const results = await race(f.lot.id, [
        () => command(path + "/delivery", body),
        () => command(path + "/delivery", body),
      ]);
      assert.deepEqual(
        results.map((r) => r.status).sort((a, b) => a - b),
        [201, 409],
      );
      assert.equal((await entryNow(f.entry.id)).deliveredKg, "73.125");
      const current = await shipmentNow(f.shipment.id);
      assert.equal(
        (
          await command(path + "/cancellation", {
            ...versionInput(current),
            reason: "No permitido",
          })
        ).status,
        409,
      );
      assert.equal(
        (
          await command(
            path + "/transport",
            {
              expectedVersion: current.version,
              transport: transport(),
              destinationLabel: "Destino",
              reason: "No permitido",
            },
            owner,
            crypto.randomUUID(),
            "PUT",
          )
        ).status,
        409,
      );
    },
  );
  await t.test(
    "permisos por acción, centro y organización y revocación antes de replay",
    async () => {
      const f = await prepare("admitted"),
        path = `/inventory/entries/${f.entry.id}`;
      for (const email of [
        "inventario2@example.test",
        "inventario-ajeno@example.test",
        "admin@example.test",
        "calidad@example.test",
        "publicacion@example.test",
      ]) {
        const auth = await login(email);
        assert.equal((await call(path, "GET", undefined, auth)).status, 404);
        assert.equal(
          (
            await command(
              path + "/release",
              { expectedVersion: f.entry.version, reason: "Ajeno" },
              auth,
            )
          ).status,
          404,
        );
      }
      const key = crypto.randomUUID(),
        body = { expectedVersion: f.entry.version, reason: "Liberación" };
      const success = await command(path + "/release", body, owner, key);
      assert.equal(success.status, 201);
      await db.query(
        "DELETE FROM access.center_grants WHERE user_id=$1 AND center_id=$2 AND action='inventory:release'",
        [logisticsIds.operator, intakeIds.center],
      );
      try {
        assert.equal(
          (await command(path + "/release", body, owner, key)).status,
          404,
        );
      } finally {
        await db.query(
          "INSERT INTO access.center_grants VALUES($1,$2,$3,'inventory:release')",
          [logisticsIds.operator, intakeIds.center, f.lot.organizationId],
        );
      }
      assert.equal(
        (
          await command(
            path + "/release",
            { ...body, reason: "Otro cuerpo" },
            owner,
            key,
          )
        ).status,
        409,
      );
      assert.equal(
        (await call("/inventory?centerId=" + intakeIds.center, "GET")).status,
        401,
      );
    },
  );
  await t.test(
    "transporte privado no altera el DTO público QR ni autoriza publicación",
    async () => {
      const f = await prepare();
      const publisher = await services.access.authenticate(
        (
          await services.access.login(
            "publicacion@example.test",
            "Fiction-only-2026!",
          )
        ).token,
      );
      const published = (
        await services.publication.publish(
          publisher,
          f.lot.id,
          { expectedVersion: 0, ...demoProjection },
          crypto.randomUUID(),
        )
      ).item;
      const before = await services.publication.query(published.publicId);
      const r = await command(
        `/shipments/${f.shipment.id}/transport`,
        {
          expectedVersion: f.shipment.version,
          transport: transport(),
          destinationLabel: "Destino privado",
          reason: "Corrección privada",
        },
        owner,
        crypto.randomUUID(),
        "PUT",
      );
      assert.equal(r.status, 200);
      const after = await services.publication.query(published.publicId);
      assert.deepEqual(after, before);
      assert.deepEqual(
        Object.keys(after).sort((a, b) => a.localeCompare(b)),
        ["lotCode", "stages"],
      );
      assert.equal(JSON.stringify(after).includes("PRIVADO"), false);
    },
  );
  await t.test(
    "cada acción logística exige su concesión y no filtra otro centro",
    async () => {
      const f = await prepare(),
        versions = versionInput(f.shipment),
        ship = "/shipments/" + f.shipment.id,
        stock = "/inventory/entries/" + f.entry.id;
      const cases = [
        ["inventory:read", () => call(stock, "GET", undefined, owner), 404],
        [
          "inventory:admit",
          () =>
            command("/inventory/entries", {
              lotId: f.lot.id,
              verifiedKg: f.lot.totalKg,
              reference: "ACTUAL",
              evidenceRef: "Conteo",
            }),
          404,
        ],
        [
          "inventory:release",
          () =>
            command(stock + "/release", {
              expectedVersion: f.entry.version,
              reason: "Liberar",
            }),
          404,
        ],
        ["shipment:read", () => call(ship, "GET", undefined, owner), 404],
        [
          "shipment:create",
          () => command("/shipments", { stockEntryId: f.entry.id }),
          404,
        ],
        [
          "shipment:update",
          () =>
            command(
              ship + "/transport",
              {
                expectedVersion: f.shipment.version,
                transport: transport(),
                reason: "Corrección",
              },
              owner,
              crypto.randomUUID(),
              "PUT",
            ),
          404,
        ],
        [
          "shipment:reserve",
          () => command(ship + "/reservation", versions),
          404,
        ],
        [
          "shipment:dispatch",
          () =>
            command(ship + "/departure", {
              ...versions,
              departedAt: new Date().toISOString(),
            }),
          404,
        ],
        [
          "shipment:deliver",
          () =>
            command(ship + "/delivery", {
              ...versions,
              receivedKg: f.shipment.quantityKg,
              deliveredAt: new Date().toISOString(),
              evidenceRef: "Entrega",
            }),
          404,
        ],
        [
          "shipment:cancel",
          () =>
            command(ship + "/cancellation", {
              ...versions,
              reason: "Cancelar",
            }),
          404,
        ],
      ];
      for (const [action, attempt, status] of cases) {
        await db.query(
          "DELETE FROM access.center_grants WHERE user_id=$1 AND center_id=$2 AND action=$3",
          [logisticsIds.operator, intakeIds.center, action],
        );
        try {
          const r = await attempt();
          assert.equal(
            r.status,
            status,
            action + ": " + JSON.stringify(r.body),
          );
        } finally {
          await db.query(
            "INSERT INTO access.center_grants VALUES($1,$2,$3,$4)",
            [
              logisticsIds.operator,
              intakeIds.center,
              f.lot.organizationId,
              action,
            ],
          );
        }
      }
      const other = await login("inventario2@example.test");
      assert.equal((await call(ship, "GET", undefined, other)).status, 404);
      assert.equal(
        (
          await call(
            "/shipments?centerId=" + intakeIds.center,
            "GET",
            undefined,
            other,
          )
        ).status,
        403,
      );
      const current = await shipmentNow(f.shipment.id);
      assert.equal(current.state, "draft");
      assert.equal(current.version, f.shipment.version);
      assert.equal(current.inventory.onHandKg, f.lot.totalKg);
      assert.equal(current.inventory.reservedKg, "0.000");
    },
  );
  await t.test(
    "reserva, salida y entrega total no descuentan dos veces y replay es estable",
    async () => {
      const candidate = await logisticsLot(services, "Fiction-only-2026!");
      const admission = {
        lotId: candidate.id,
        verifiedKg: candidate.totalKg,
        reference: "DEMO",
        evidenceRef: "Conteo actual ficticio",
      };
      let r = await command("/inventory/entries", admission);
      assert.equal(r.status, 201, JSON.stringify(r.body));
      let entry = r.body;
      r = await command(`/inventory/entries/${entry.id}/release`, {
        expectedVersion: entry.version,
        reason: "Liberación logística explícita",
      });
      assert.equal(r.status, 201, JSON.stringify(r.body));
      entry = r.body;
      r = await command("/shipments", { stockEntryId: entry.id });
      assert.equal(r.status, 201, JSON.stringify(r.body));
      let shipment = r.body;
      const path = "/shipments/" + shipment.id;
      r = await command(path + "/reservation", {
        expectedVersion: shipment.version,
        expectedInventoryVersion: entry.version,
      });
      assert.equal(r.status, 201, JSON.stringify(r.body));
      shipment = r.body;
      entry = shipment.inventory;
      assert.equal(entry.onHandKg, "73.125");
      assert.equal(entry.reservedKg, "73.125");
      assert.equal(entry.unreservedKg, "0.000");
      r = await command(path + "/departure", {
        expectedVersion: shipment.version,
        expectedInventoryVersion: entry.version,
        departedAt: new Date().toISOString(),
      });
      assert.equal(r.status, 422);
      assert.equal(r.body.error.code, "TRANSPORT_INCOMPLETE");
      const transport = {
        guideReference: "DEMO-" + shipment.id,
        vehicleLabel: "Unidad ficticia",
        plate: "DEMO-001",
        driverName: "Chofer ficticio privado",
        sealReference: "PRECINTO-DEMO",
      };
      r = await command(
        path + "/transport",
        {
          expectedVersion: shipment.version,
          transport,
          destinationLabel: "Destino ficticio privado",
          reason: "Completar transporte",
        },
        owner,
        crypto.randomUUID(),
        "PUT",
      );
      assert.equal(r.status, 200, JSON.stringify(r.body));
      shipment = r.body;
      const departure = {
          expectedVersion: shipment.version,
          expectedInventoryVersion: entry.version,
          departedAt: new Date().toISOString(),
        },
        key = crypto.randomUUID();
      r = await command(path + "/departure", departure, owner, key);
      assert.equal(r.status, 201, JSON.stringify(r.body));
      shipment = r.body;
      entry = shipment.inventory;
      assert.equal(entry.onHandKg, "0.000");
      assert.equal(entry.inTransitKg, "73.125");
      assert.equal(
        (await command(path + "/departure", departure, owner, key)).status,
        200,
      );
      const delivery = {
          expectedVersion: shipment.version,
          expectedInventoryVersion: entry.version,
          receivedKg: "73.125",
          deliveredAt: new Date().toISOString(),
          evidenceRef: "Confirmación ficticia",
        },
        deliveryKey = crypto.randomUUID();
      r = await command(path + "/delivery", delivery, owner, deliveryKey);
      assert.equal(r.status, 201, JSON.stringify(r.body));
      assert.equal(r.body.inventory.onHandKg, "0.000");
      assert.equal(r.body.inventory.inTransitKg, "0.000");
      assert.equal(r.body.inventory.deliveredKg, "73.125");
      const replay = await command(
        path + "/delivery",
        delivery,
        owner,
        deliveryKey,
      );
      assert.equal(replay.status, 200);
      assert.deepEqual(replay.body, r.body);
      assert.equal(
        (
          await command(path + "/delivery", {
            ...delivery,
            expectedVersion: r.body.version,
            expectedInventoryVersion: r.body.inventory.version,
          })
        ).status,
        409,
      );
    },
  );
  await t.test(
    "admisión explícita única por cantidad real en cuarentena",
    async () => {
      const input = {
        lotId: lot.id,
        verifiedKg: lot.totalKg,
        reference: "ACTUAL-DEMO",
        evidenceRef: "Verificación física actual ficticia",
      };
      const r = await command("/inventory/entries", input);
      assert.equal(r.status, 201, JSON.stringify(r.body));
      assert.equal(r.body.onHandKg, "73.125");
      assert.equal(r.body.disposition, "quarantine");
      assert.equal((await command("/inventory/entries", input)).status, 409);
    },
  );
});
