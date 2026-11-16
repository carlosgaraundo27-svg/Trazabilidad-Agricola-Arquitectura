import React from "react";
import { Quantities } from "./InventoryPanel.jsx";
import { TransportForm } from "./TransportForm.jsx";
export const shipmentStates = {
  draft: "En preparación",
  reserved: "Reservado",
  in_transit: "En tránsito",
  delivered: "Entregado",
  cancelled: "Cancelado antes de salida",
};
const limaNow = () =>
  new Date(Date.now() - 5 * 3600000).toISOString().slice(0, -1);
const instant = (value) => new Date(value + "-05:00").toISOString();
export function ShipmentDetail({ item, actions, busy, onCommand, onHistory }) {
  const versions = {
      expectedVersion: item.version,
      expectedInventoryVersion: item.inventory.version,
    },
    beforeDeparture = ["draft", "reserved"].includes(item.state);
  const complete =
    !!item.destinationLabel && Object.values(item.transport).every(Boolean);
  return (
    <section
      className="register logistics-detail"
      aria-label="Detalle del despacho"
    >
      <h2>Detalle del despacho</h2>
      <p role="status" aria-label="Estado del despacho" className="state-label">
        {shipmentStates[item.state]}
      </p>
      <p>
        Lote <code>{item.lotId}</code> · Despacho <code>{item.id}</code>
      </p>
      <p>
        Cantidad completa: <strong>{item.quantityKg} kg</strong>. Conservar
        composición y origen; sin parciales ni pallets.
      </p>
      <Quantities item={item.inventory} />
      {item.state === "reserved" && (
        <p>Reserva activa sin vencimiento automático.</p>
      )}
      {beforeDeparture && actions.includes("shipment:update") && (
        <TransportForm
          key={item.version}
          item={item}
          busy={busy}
          onCommand={onCommand}
        />
      )}
      {!beforeDeparture && (
        <dl>
          <dt>Guía</dt>
          <dd>{item.transport.guideReference}</dd>
          <dt>Vehículo / placa</dt>
          <dd>
            {item.transport.vehicleLabel} / {item.transport.plate}
          </dd>
          <dt>Chofer / precinto</dt>
          <dd>
            {item.transport.driverName} / {item.transport.sealReference}
          </dd>
          <dt>Destino</dt>
          <dd>{item.destinationLabel}</dd>
        </dl>
      )}
      {item.state === "draft" && actions.includes("shipment:reserve") && (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            onCommand(`/shipments/${item.id}/reservation`, versions, "shipment")
          }
        >
          Reservar lote completo
        </button>
      )}
      {item.state === "reserved" && actions.includes("shipment:dispatch") && (
        <form
          key={"departure-" + item.version}
          onSubmit={(e) => {
            e.preventDefault();
            onCommand(
              `/shipments/${item.id}/departure`,
              {
                ...versions,
                departedAt: instant(new FormData(e.currentTarget).get("at")),
              },
              "shipment",
            );
          }}
        >
          <h3>Confirmar salida física</h3>
          <p>La salida descontará una sola vez la existencia en centro.</p>
          <label>
            Fecha de salida (hora de Lima)
            <input
              name="at"
              type="datetime-local"
              step="0.001"
              defaultValue={limaNow()}
              required
              disabled={busy}
            />
          </label>
          {!complete && (
            <p>Completa el transporte y el destino para confirmar la salida.</p>
          )}
          <button type="submit" disabled={busy || !complete}>
            Confirmar salida
          </button>
        </form>
      )}
      {beforeDeparture && actions.includes("shipment:cancel") && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onCommand(
              `/shipments/${item.id}/cancellation`,
              {
                ...versions,
                reason: new FormData(e.currentTarget).get("reason"),
              },
              "shipment",
            );
          }}
        >
          <h3>Cancelar antes de salida</h3>
          <p>
            Si existe reserva, se liberará atómicamente sin sumar otra entrada
            física.
          </p>
          <label>
            Motivo de cancelación
            <textarea name="reason" required maxLength={500} disabled={busy} />
          </label>
          <button type="submit" className="secondary" disabled={busy}>
            Cancelar antes de salida
          </button>
        </form>
      )}
      {item.state === "in_transit" && actions.includes("shipment:deliver") && (
        <form
          key={item.version}
          onSubmit={(e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(e.currentTarget));
            onCommand(
              `/shipments/${item.id}/delivery`,
              {
                ...versions,
                receivedKg: data.receivedKg,
                deliveredAt: instant(data.at),
                evidenceRef: data.evidenceRef,
              },
              "shipment",
            );
          }}
        >
          <h3>Confirmar entrega total</h3>
          <p>
            La entrega no vuelve a descontar stock en centro. Las diferencias
            requieren conciliación fuera de este alcance.
          </p>
          <label>
            Cantidad recibida (kg)
            <input
              name="receivedKg"
              inputMode="decimal"
              defaultValue={item.quantityKg}
              required
              disabled={busy}
            />
          </label>
          <label>
            Fecha de entrega (hora de Lima)
            <input
              name="at"
              type="datetime-local"
              step="0.001"
              defaultValue={limaNow()}
              required
              disabled={busy}
            />
          </label>
          <label>
            Evidencia de entrega
            <textarea
              name="evidenceRef"
              required
              maxLength={500}
              disabled={busy}
            />
          </label>
          <button type="submit" disabled={busy}>
            Confirmar entrega total
          </button>
        </form>
      )}
      {!beforeDeparture && (
        <p>
          Edición ordinaria, cancelación y devolución bloqueadas en este
          alcance.
        </p>
      )}
      {item.delivery && (
        <p>
          Entrega registrada: {item.delivery.receivedKg} kg ·{" "}
          {new Date(item.delivery.deliveredAt).toLocaleString("es-PE")} ·{" "}
          {item.delivery.evidenceRef}
        </p>
      )}
      <button
        type="button"
        className="secondary"
        disabled={busy}
        onClick={() => onHistory("shipment", item.id)}
      >
        Consultar historial del despacho
      </button>
    </section>
  );
}
