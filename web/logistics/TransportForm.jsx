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
        <span>Referencia de guía</span>
        <input
          name="guideReference"
          maxLength={120}
          defaultValue={item.transport.guideReference ?? ""}
          disabled={busy}
        />
      </label>
      <label>
        <span>Vehículo</span>
        <input
          name="vehicleLabel"
          maxLength={120}
          defaultValue={item.transport.vehicleLabel ?? ""}
          disabled={busy}
        />
      </label>
      <label>
        <span>Placa</span>
        <input
          name="plate"
          maxLength={120}
          defaultValue={item.transport.plate ?? ""}
          disabled={busy}
        />
      </label>
      <label>
        <span>Chofer</span>
        <input
          name="driverName"
          maxLength={120}
          defaultValue={item.transport.driverName ?? ""}
          disabled={busy}
        />
      </label>
      <label>
        <span>Precinto</span>
        <input
          name="sealReference"
          maxLength={120}
          defaultValue={item.transport.sealReference ?? ""}
          disabled={busy}
        />
      </label>
      <label>
        <span>Destino</span>
        <input
          name="destinationLabel"
          maxLength={120}
          defaultValue={item.destinationLabel ?? ""}
          disabled={busy}
        />
      </label>
      <label>
        <span>Motivo de corrección</span>
        <textarea name="reason" maxLength={500} required disabled={busy} />
      </label>
      <button type="submit" disabled={busy}>
        Guardar transporte
      </button>
    </form>
  );
}
