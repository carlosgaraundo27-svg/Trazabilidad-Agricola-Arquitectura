import React from "react";
import { shipmentStates } from "../logistics/ShipmentDetail.jsx";

export function ReportFilters({
  centers,
  filters,
  loading,
  onChange,
  onApply,
}) {
  return (
    <form onSubmit={onApply} aria-label="Filtros de salidas y entregas">
      <div className="report-filters">
        <label>
          Centro del reporte
          <select
            value={filters.centerId}
            onChange={(e) => onChange("centerId", e.target.value)}
          >
            {centers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Salida desde (UTC, inclusiva)
          <input
            type="datetime-local"
            step="0.001"
            required
            value={filters.from}
            onChange={(e) => onChange("from", e.target.value)}
          />
        </label>
        <label>
          Salida hasta (UTC, exclusiva)
          <input
            type="datetime-local"
            step="0.001"
            required
            value={filters.to}
            onChange={(e) => onChange("to", e.target.value)}
          />
        </label>
        <label>
          Estado del reporte
          <select
            value={filters.state}
            onChange={(e) => onChange("state", e.target.value)}
          >
            <option value="">En tránsito y entregados</option>
            {Object.entries(shipmentStates)
              .filter(([state]) => ["in_transit", "delivered"].includes(state))
              .map(([state, label]) => (
                <option key={state} value={state}>
                  {label}
                </option>
              ))}
          </select>
        </label>
        <label>
          Lote exacto (opcional)
          <input
            type="text"
            value={filters.lotId}
            maxLength="36"
            placeholder="UUID del lote"
            onChange={(e) => onChange("lotId", e.target.value)}
          />
        </label>
      </div>
      <p className="muted">
        Las fechas filtran la salida, en UTC: desde incluye el instante y hasta
        lo excluye. Máximo 31 días por consulta.
      </p>
      <button type="submit" disabled={loading}>
        Consultar reporte
      </button>
    </form>
  );
}
