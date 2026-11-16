import React from "react";
export function TransportForm({ item, busy, onCommand }) {
  async function submit(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const transport = Object.fromEntries(
      [
        "guideReference",
        "vehicleLabel",
        "plate",
        "driverName",
        "sealReference",
      ].map((k) => [k, data[k].trim() || null]),
    );
    await onCommand(
      `/shipments/${item.id}/transport`,
      {
        expectedVersion: item.version,
        transport,
        destinationLabel: data.destinationLabel.trim() || null,
        reason: data.reason,
      },
      "shipment",
      "PUT",
    );
  }
  return (
    <form aria-label="Transporte interno" onSubmit={submit}>
      <h3>Transporte antes de salida</h3>
      <p>
        Datos internos. La referencia de guía es única por organización y centro
        en esta demostración, incluso tras corrección o cancelación; no implica
        validez legal.
      </p>
      <label>
        Referencia de guía
        <input
          name="guideReference"
          maxLength={120}
          defaultValue={item.transport.guideReference ?? ""}
          disabled={busy}
        />
      </label>
      <label>
        Vehículo
        <input
          name="vehicleLabel"
          maxLength={120}
          defaultValue={item.transport.vehicleLabel ?? ""}
          disabled={busy}
        />
      </label>
      <label>
        Placa
        <input
          name="plate"
          maxLength={120}
          defaultValue={item.transport.plate ?? ""}
          disabled={busy}
        />
      </label>
      <label>
        Chofer
        <input
          name="driverName"
          maxLength={120}
          defaultValue={item.transport.driverName ?? ""}
          disabled={busy}
        />
      </label>
      <label>
        Precinto
        <input
          name="sealReference"
          maxLength={120}
          defaultValue={item.transport.sealReference ?? ""}
          disabled={busy}
        />
      </label>
      <label>
        Destino
        <input
          name="destinationLabel"
          maxLength={120}
          defaultValue={item.destinationLabel ?? ""}
          disabled={busy}
        />
      </label>
      <label>
        Motivo de corrección
        <textarea name="reason" maxLength={500} required disabled={busy} />
      </label>
      <button type="submit" disabled={busy}>
        Guardar transporte
      </button>
    </form>
  );
}
