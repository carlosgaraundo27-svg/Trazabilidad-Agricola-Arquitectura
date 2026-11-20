import React from "react";
import { shipmentStates } from "../logistics/ShipmentDetail.jsx";

export function ReportTable({ items }) {
  return (
    <section
      className="report-table"
      aria-label="Tabla de salidas y entregas"
      tabIndex="0"
    >
      <table>
        <caption>
          Una fila por despacho · cantidades en kg · fechas UTC · sin totales
        </caption>
        <thead>
          <tr>
            {[
              "Despacho y lote",
              "Centro",
              "Estado",
              "Cantidad (kg)",
              "Recibido (kg)",
              "Salida (UTC)",
              "Entrega (UTC)",
              "Duración (s)",
            ].map((label) => (
              <th key={label} scope="col">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.shipmentId} data-testid="report-row">
              <th scope="row">
                <span>Despacho</span>
                <code>{item.shipmentId}</code>
                <span>Lote</span>
                <code>{item.lotId}</code>
              </th>
              <td>{item.centerName}</td>
              <td>
                {shipmentStates[item.state]}
                {item.dataIssue && <p>Inconsistencia de datos</p>}
              </td>
              <td>{item.quantityKg}</td>
              <td>{item.receivedKg ?? "Pendiente"}</td>
              <td>
                <time dateTime={item.departedAt}>{item.departedAt}</time>
              </td>
              <td>
                {item.deliveredAt ? (
                  <time dateTime={item.deliveredAt}>{item.deliveredAt}</time>
                ) : (
                  "Pendiente"
                )}
              </td>
              <td>
                {item.durationSeconds ??
                  (item.dataIssue ? "No calculable" : "Pendiente")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
