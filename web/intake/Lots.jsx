import React from "react";
export function Lots({ lots, receipts }) {
  return (
    <section aria-labelledby="lots-title">
      <h2 id="lots-title">Lotes consolidados</h2>
      {!lots.length ? (
        <p>No hay lotes consolidados en este centro.</p>
      ) : (
        <ul className="lot-list">
          {lots.map((lot) => (
            <li key={lot.id} data-testid="lot">
              <h3>{lot.totalKg} kg</h3>
              <p className="state-label">
                Pendiente de calidad · Despacho no autorizado
              </p>
              <small data-testid="lot-id">{lot.id}</small>
              <p>
                {lot.localHarvestDate} ·{" "}
                {lot.contributions[0]?.origin.producerName} /{" "}
                {lot.contributions[0]?.origin.parcelName}
              </p>
              <h4>Composición conservada</h4>
              <ul>
                {lot.contributions.map((a) => (
                  <li key={a.id}>
                    <strong>{a.amountKg} kg</strong> ·{" "}
                    {receipts.find((r) => r.id === a.receiptId)?.reference ??
                      a.receiptId}
                    <br />
                    <small>
                      Pre-lote {a.origin.id}
                      <br />
                      Cosecha {a.origin.harvestId}
                      <br />
                      Parcela {a.origin.parcelId}
                      <br />
                      Productor {a.origin.producerId}
                    </small>
                  </li>
                ))}
              </ul>
              <details>
                <summary>Evento de consolidación</summary>
                {lot.events.map((e) => (
                  <p key={e.id}>
                    {new Date(e.occurredAt).toLocaleString("es-PE")}
                    <br />
                    <small>
                      Actor {e.actorId}
                      <br />
                      Evento {e.id}
                    </small>
                  </p>
                ))}
              </details>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
