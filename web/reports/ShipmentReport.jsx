import React from "react";
import { useShipmentReport } from "./useShipmentReport.js";
import { ReportFilters } from "./ReportFilters.jsx";
import { ReportTable } from "./ReportTable.jsx";

export function ShipmentReport({ centers }) {
  const r = useShipmentReport(centers);
  return (
    <section aria-label="Reporte operativo de salidas y entregas">
      <p className="eyebrow">07 / CONSULTA OPERATIVA</p>
      <h1>Salidas y entregas por centro</h1>
      <p>
        Consulta hechos registrados, sin modificar el inventario. La duración
        corresponde a salida–entrega; no representa tiempo de conducción ni
        merma.
      </p>
      <ReportFilters
        centers={centers}
        filters={r.filters}
        loading={r.loading}
        onChange={r.change}
        onApply={r.apply}
      />
      {r.loading && (
        <output aria-live="polite">Consultando salidas y entregas…</output>
      )}
      {r.error && (
        <div>
          <p role="alert">{r.error}</p>
          <button type="button" onClick={r.retry}>
            Reintentar consulta
          </button>
        </div>
      )}
      {!r.query && (
        <output>Selecciona los filtros y consulta el reporte.</output>
      )}
      {r.data && r.query && (
        <>
          <p>
            Salida filtrada:{" "}
            <time dateTime={r.query.filters.from}>{r.query.filters.from}</time>{" "}
            (incluida) a{" "}
            <time dateTime={r.query.filters.to}>{r.query.filters.to}</time>{" "}
            (excluida).
          </p>
          <p className="muted">
            Consulta generada: {r.data.generatedAt}. Cada página refleja los
            hechos disponibles al consultarla.
          </p>
          {r.data.items.length ? (
            <ReportTable items={r.data.items} />
          ) : (
            <output>No hay salidas que coincidan con estos filtros.</output>
          )}
          <nav className="pagination" aria-label="Páginas del reporte">
            <button
              type="button"
              disabled={r.loading || r.query.cursors.length === 1}
              onClick={() => r.page(false)}
            >
              Página anterior
            </button>
            <span>
              Página {r.query.cursors.length} · hasta {r.data.limit} filas por
              página
            </span>
            <button
              type="button"
              disabled={r.loading || !r.data.nextCursor}
              onClick={() => r.page(true)}
            >
              Página siguiente
            </button>
          </nav>
        </>
      )}
    </section>
  );
}
