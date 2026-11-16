import React from "react";
export function ReceiptTemperatures({ items, missing }) {
  return (
    <section aria-label="Temperaturas originales de recepción">
      <h3>Temperaturas originales de recepción</h3>
      {missing.length > 0 ? (
        <p role="status">
          Cierre bloqueado: {missing.length} recepción(es) sin temperatura
          original documentada. Las lecturas posteriores no sustituyen este
          dato.
        </p>
      ) : (
        <p>Todas las recepciones tienen temperatura original documentada.</p>
      )}
      <ul className="receipt-list">
        {items.map((r) => (
          <li key={r.receiptId} data-testid="original-temperature">
            <h4>{r.reference}</h4>
            <small>Recepción: {r.receiptId}</small>
            {r.temperature ? (
              <>
                <p>
                  {r.temperature.value} °C · Medida (hora de Lima):{" "}
                  {new Date(r.temperature.measuredAt).toLocaleString("es-PE", {
                    timeZone: "America/Lima",
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    fractionalSecondDigits: 3,
                  })}
                </p>
                <p>
                  Procedencia: {r.temperature.provenance}
                  <br />
                  Observador: {r.temperature.observedBy}
                  <br />
                  Método: {r.temperature.method}
                </p>
                <small>
                  Responsable de registro: {r.temperature.recordedBy}
                  <br />
                  Registro:{" "}
                  {new Date(r.temperature.recordedAt).toLocaleString("es-PE")}
                  <br />
                  Dato original: {r.temperature.id}
                </small>
              </>
            ) : (
              <p>
                <strong>Pendiente: sin temperatura original.</strong> La
                recepción se conserva intacta. Este incremento no permite
                completar registros históricos; requieren un procedimiento
                explícito y auditado desde evidencia original.
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
