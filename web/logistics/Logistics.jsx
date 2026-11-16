import React from "react";
import { useLogistics } from "./useLogistics.js";
import { AdmissionForm, InventoryDetail } from "./InventoryPanel.jsx";
import { ShipmentDetail, shipmentStates } from "./ShipmentDetail.jsx";
import { LogisticsHistory } from "./LogisticsHistory.jsx";
export function Logistics({ centers }) {
  const {
    centerId,
    offset,
    data,
    selection,
    history,
    busy,
    error,
    notice,
    pending,
    confirmation,
    actions,
    disabled,
    load,
    execute,
    command,
    refresh,
    showHistory,
    changeCenter,
    changePage,
  } = useLogistics(centers);
  return (
    <section aria-label="Administración logística">
      <p className="eyebrow">06 / EXISTENCIAS Y ENTREGA</p>
      <h1>Inventario y despachos</h1>
      <p>
        Admite, libera y reserva cada lote completo. Confirma su salida y
        entrega conservando cantidades y origen.
      </p>
      <label>
        Centro logístico
        <select
          value={centerId}
          disabled={disabled}
          onChange={(e) => changeCenter(e.target.value)}
        >
          {centers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <p role="alert">{error}</p>
      <p role="status" ref={confirmation} tabIndex="-1">
        {busy ? "Procesando…" : notice}
      </p>
      {pending && (
        <div className="confirmation">
          <p>
            No se conoce el resultado de la solicitud. Reintenta la misma
            operación antes de iniciar otra.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => execute(pending)}
          >
            Reintentar misma operación
          </button>
        </div>
      )}
      <button
        type="button"
        className="secondary"
        disabled={disabled}
        onClick={refresh}
      >
        Actualizar inventario y despachos
      </button>
      {selection?.kind === "entry" && (
        <InventoryDetail
          key={selection.item.id + ":" + selection.item.version}
          item={selection.item}
          actions={actions}
          busy={disabled}
          onCommand={command}
          onHistory={showHistory}
        />
      )}
      {selection?.kind === "shipment" && (
        <ShipmentDetail
          key={selection.item.id + ":" + selection.item.version}
          item={selection.item}
          actions={actions}
          busy={disabled}
          onCommand={command}
          onHistory={showHistory}
        />
      )}
      {data && (
        <>
          <div className="logistics-layout">
            {actions.includes("inventory:admit") && (
              <AdmissionForm
                key={centerId}
                lots={data.lots}
                busy={disabled}
                onCommand={command}
              />
            )}
            <div>
              {actions.includes("inventory:read") && (
                <section>
                  <h2>Existencias en el centro</h2>
                  {!data.entries.length ? (
                    <p>No hay entradas de inventario en esta página.</p>
                  ) : (
                    <ul>
                      {data.entries.map((e) => (
                        <li key={e.id}>
                          <strong>Lote {e.lotId}</strong>
                          <span>
                            {e.onHandKg} kg en centro · {e.reservedKg} kg
                            reservados
                          </span>
                          <button
                            type="button"
                            className="secondary"
                            disabled={disabled}
                            onClick={() => load("entry", e.id)}
                          >
                            Consultar inventario
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )}
              {actions.includes("shipment:read") && (
                <section>
                  <h2>Despachos del centro</h2>
                  {!data.shipments.length ? (
                    <p>No hay despachos en esta página.</p>
                  ) : (
                    <ul>
                      {data.shipments.map((s) => (
                        <li key={s.id} data-testid="shipment-row">
                          <strong>Lote {s.lotId}</strong>
                          <span>
                            {s.quantityKg} kg · {shipmentStates[s.state]}
                          </span>
                          <button
                            type="button"
                            className="secondary"
                            disabled={disabled}
                            onClick={() => load("shipment", s.id)}
                          >
                            Consultar despacho
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )}
            </div>
          </div>
          <nav className="pagination" aria-label="Páginas de logística">
            <button
              type="button"
              disabled={disabled || offset === 0}
              onClick={() => changePage(offset - 100)}
            >
              Página anterior
            </button>
            <span>Página {offset / 100 + 1}</span>
            <button
              type="button"
              disabled={
                disabled ||
                ![data.lots, data.entries, data.shipments].some(
                  (rows) => rows.length === 100,
                )
              }
              onClick={() => changePage(offset + 100)}
            >
              Página siguiente
            </button>
          </nav>
        </>
      )}
      {history && (
        <LogisticsHistory
          history={history}
          busy={disabled}
          onPage={(page) => showHistory(history.kind, history.id, page)}
        />
      )}
    </section>
  );
}
