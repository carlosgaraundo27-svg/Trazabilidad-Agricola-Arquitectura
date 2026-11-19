import React from "react";
const names = {
  admitted: "Admisión en cuarentena",
  released: "Liberación logística",
  created: "Preparación",
  transport_corrected: "Corrección de transporte",
  reserved: "Reserva",
  reservation_released: "Reserva liberada",
  cancelled: "Cancelación antes de salida",
  dispatched: "Salida confirmada",
  delivered: "Entrega confirmada",
};
export function LogisticsHistory({ history, busy, onPage }) {
  const { data, offset, kind } = history;
  return (
    <section
      className="register logistics-detail"
      aria-label="Historial logístico"
    >
      <h2>
        {kind === "entry"
          ? "Movimientos de inventario"
          : "Historial del despacho"}
      </h2>
      <p>
        Registro consultado con versión {data.snapshotVersion}. Los hechos
        anteriores se conservan.
      </p>
      <ol>
        {data.items.map((e) => (
          <li key={e.id}>
            <strong>{names[e.kind]}</strong>
            <span>
              {e.amountKg ? e.amountKg + " kg · " : ""}
              {new Date(e.occurredAt).toLocaleString("es-PE")}
            </span>
            <small>Responsable interno: {e.actorId}</small>
            {e.payload?.reason && <p>Motivo: {e.payload.reason}</p>}
            {e.kind === "transport_corrected" && (
              <dl>
                <dt>Guía anterior</dt>
                <dd>
                  {e.payload.before.transport.guideReference ?? "Sin registrar"}
                </dd>
                <dt>Guía corregida</dt>
                <dd>
                  {e.payload.after.transport.guideReference ?? "Sin registrar"}
                </dd>
                <dt>Placa anterior / corregida</dt>
                <dd>
                  {e.payload.before.transport.plate ?? "Sin registrar"} /{" "}
                  {e.payload.after.transport.plate ?? "Sin registrar"}
                </dd>
              </dl>
            )}
          </li>
        ))}
      </ol>
      {!data.items.length && <p>No hay hechos en esta página.</p>}
      <nav className="pagination" aria-label="Páginas del historial">
        <button
          type="button"
          disabled={busy || offset === 0}
          onClick={() => onPage(offset - 100)}
        >
          Hechos anteriores
        </button>
        <button
          type="button"
          disabled={busy || data.items.length < 100}
          onClick={() => onPage(offset + 100)}
        >
          Hechos siguientes
        </button>
      </nav>
    </section>
  );
}
