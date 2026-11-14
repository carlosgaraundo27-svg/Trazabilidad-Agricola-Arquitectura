import React from "react";
const states = {
  weighed: "Pesada",
  pending_review: "Pendiente de revisión",
  confirmed: "Confirmada",
};
export function ReceiptList({
  receipts,
  actions,
  user,
  busy,
  selected,
  onSelect,
  onCommand,
}) {
  return (
    <section aria-labelledby="receipts-title">
      <h2 id="receipts-title">Recepciones y saldos</h2>
      {!receipts.length ? (
        <p>No hay recepciones en este centro.</p>
      ) : (
        <ul className="receipt-list">
          {receipts.map((r) => (
            <li key={r.id} data-testid={"receipt-" + r.reference}>
              <div className="receipt-heading">
                <h3>{r.reference}</h3>
                <span className="state-label">{states[r.status]}</span>
              </div>
              <p>
                {r.origin.producerName} / {r.origin.parcelName} ·{" "}
                {r.origin.localHarvestDate}
              </p>
              <dl className="weights">
                <div>
                  <dt>Declarado</dt>
                  <dd>
                    {r.origin.quantity} {r.origin.unit}
                  </dd>
                </div>
                <div>
                  <dt>Bruto / tara</dt>
                  <dd>
                    {r.grossKg} / {r.tareKg} kg
                  </dd>
                </div>
                <div>
                  <dt>Neto recibido</dt>
                  <dd>{r.netKg} kg</dd>
                </div>
                <div>
                  <dt>Saldo habilitado disponible</dt>
                  <dd>{r.availableKg} kg</dd>
                </div>
              </dl>
              {r.reviewReason && (
                <p className="discrepancy">
                  {r.differenceKg === null
                    ? "Dimensiones distintas; sin conversión."
                    : "Diferencia registrada: " + r.differenceKg + " kg."}{" "}
                  {r.review
                    ? "Revisión independiente aprobada."
                    : "Requiere revisión independiente."}
                </p>
              )}
              {r.review && (
                <p>
                  Motivo de aprobación: {r.review.note}
                  <br />
                  <small>Responsable: {r.review.approvedBy}</small>
                </p>
              )}
              {r.status === "pending_review" &&
                actions.includes("intake:review") &&
                (r.capturedBy === user.id ? (
                  <p>Otra persona debe revisar esta captura.</p>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      onCommand(
                        `/intake/receipts/${r.id}/reviews`,
                        { note: new FormData(e.currentTarget).get("note") },
                        "Revisión aprobada",
                      );
                    }}
                  >
                    <label>
                      Motivo de revisión de {r.reference}
                      <textarea
                        name="note"
                        rows={2}
                        maxLength={500}
                        required
                        disabled={busy}
                      />
                    </label>
                    <button disabled={busy}>Aprobar discrepancia</button>
                  </form>
                ))}
              {r.status === "weighed" && actions.includes("intake:confirm") && (
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() =>
                    onCommand(
                      `/intake/receipts/${r.id}/confirmation`,
                      {},
                      "Recepción confirmada",
                    )
                  }
                >
                  Confirmar recepción
                </button>
              )}
              {actions.includes("lot:consolidate") &&
                r.availableKg !== "0.000" && (
                  <label className="selection">
                    <input
                      type="checkbox"
                      checked={selected.includes(r.id)}
                      onChange={(e) => onSelect(r.id, e.target.checked)}
                      disabled={busy}
                    />
                    Aportar recepción {r.reference} completa ({r.availableKg}{" "}
                    kg)
                  </label>
                )}
              <small>
                Recepción: {r.id}
                <br />
                Pre-lote: {r.preLotId}
                <br />
                Cosecha: {r.origin.harvestId}
              </small>
              <details>
                <summary>Historial de recepción</summary>
                <ul>
                  {r.events.map((e) => (
                    <li key={e.id}>
                      {e.kind} ·{" "}
                      {new Date(e.occurredAt).toLocaleString("es-PE")}
                      <br />
                      <small>{e.actorId}</small>
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
