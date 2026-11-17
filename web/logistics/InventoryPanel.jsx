import React from "react";
export function Quantities({ item }) {
  const fields = {
    onHandKg: "En centro",
    reservedKg: "Reservado",
    unreservedKg: "Disponible sin reserva",
    inTransitKg: "En tránsito",
    deliveredKg: "Entregado",
  };
  return (
    <section aria-label="Cantidades del lote">
      <h3>Cantidades del lote</h3>
      <dl className="weights">
        {Object.entries(fields).map(([field, label]) => (
          <div key={field}>
            <dt>{label}</dt>
            <dd data-testid={"balance-" + field}>{item[field]} kg</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
export function AdmissionForm({ lots, busy, onCommand }) {
  const candidates = lots.filter((l) => !l.stockEntryId);
  return (
    <section aria-label="Admisión explícita">
      <h2>Admitir un lote</h2>
      <p>
        Verifica su cantidad física actual. El registro conserva el total real
        del lote y no reconstruye movimientos pasados.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const values = Object.fromEntries(new FormData(form));
          if (await onCommand("/inventory/entries", values, "entry"))
            form.reset();
        }}
      >
        <label htmlFor="inventory-lot">Lote a admitir</label>
        <select id="inventory-lot" name="lotId" required disabled={busy}>
          <option value="">Seleccionar…</option>
          {candidates.map((l) => (
            <option key={l.id} value={l.id}>
              {l.id} · {l.totalKg} kg
            </option>
          ))}
        </select>
        <label>
          <span>Peso verificado (kg)</span>
          <input
            name="verifiedKg"
            inputMode="decimal"
            required
            disabled={busy}
          />
        </label>
        <label>
          <span>Referencia de admisión</span>
          <input name="reference" maxLength={120} required disabled={busy} />
        </label>
        <label>
          <span>Evidencia de admisión</span>
          <textarea
            name="evidenceRef"
            maxLength={500}
            required
            disabled={busy}
          />
        </label>
        <button type="submit" disabled={busy || !candidates.length}>
          Admitir en cuarentena
        </button>
      </form>
      {!candidates.length && <p>No hay lotes sin admitir en esta página.</p>}
    </section>
  );
}
export function InventoryDetail({ item, actions, busy, onCommand, onHistory }) {
  const approved =
    item.qualitySummary?.evaluationState === "closed" &&
    item.qualitySummary?.qualityResult === "accepted";
  return (
    <section
      className="register logistics-detail"
      aria-label="Detalle de inventario"
    >
      <h2>Detalle de inventario</h2>
      <p className="state-label">
        {item.disposition === "released"
          ? "Liberado para logística"
          : "En cuarentena"}
      </p>
      <p>
        Lote <code>{item.lotId}</code> · {item.admittedKg} kg
      </p>
      <p>
        Calidad:{" "}
        {approved
          ? "Evaluación cerrada · Aprobado"
          : "Sin evaluación cerrada aprobada"}
        . Publicar el QR no autoriza salida.
      </p>
      <Quantities item={item} />
      <p>Empaque y pallets pendientes; RF-10 parcial.</p>
      <details>
        <summary>Composición y origen conservados</summary>
        <ul>
          {item.contributions.map((c) => (
            <li key={c.receiptId}>
              {c.amountKg} kg · {c.origin.producerName} / {c.origin.parcelName}
              <br />
              <small>Recepción {c.receiptId}</small>
            </li>
          ))}
        </ul>
      </details>
      {item.disposition === "quarantine" &&
        actions.includes("inventory:release") && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onCommand(
                `/inventory/entries/${item.id}/release`,
                {
                  expectedVersion: item.version,
                  reason: new FormData(e.currentTarget).get("reason"),
                },
                "entry",
              );
            }}
          >
            <label>
              <span>Motivo de liberación</span>
              <textarea
                name="reason"
                maxLength={500}
                required
                disabled={busy}
              />
            </label>
            <button type="submit" disabled={busy || !approved}>
              Liberar para logística
            </button>
          </form>
        )}
      {actions.includes("shipment:create") && (
        <button
          type="button"
          disabled={busy || item.onHandKg !== item.admittedKg}
          onClick={() =>
            onCommand("/shipments", { stockEntryId: item.id }, "shipment")
          }
        >
          Preparar despacho completo
        </button>
      )}
      <button
        type="button"
        className="secondary"
        disabled={busy}
        onClick={() => onHistory("entry", item.id)}
      >
        Consultar movimientos
      </button>
    </section>
  );
}
