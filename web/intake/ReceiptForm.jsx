import React from "react";
function preview(gross, tare) {
  const valid = /^(?:0|[1-9][0-9]{0,8})(?:\.[0-9]{1,3})?$/;
  if (!valid.test(gross) || !valid.test(tare)) return "—";
  const milli = (s) => {
    const [w, d = ""] = s.split(".");
    return BigInt(w) * 1000n + BigInt(d.padEnd(3, "0"));
  };
  const n = milli(gross) - milli(tare);
  return n > 0n
    ? String(n / 1000n) + "." + String(n % 1000n).padStart(3, "0")
    : "—";
}
export function ReceiptForm({ origins, busy, onReceive }) {
  const [preLotId, setPreLotId] = React.useState(""),
    [gross, setGross] = React.useState(""),
    [tare, setTare] = React.useState("0");
  const selected = origins.find((o) => o.id === preLotId);
  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    if (await onReceive(values)) {
      form.reset();
      setPreLotId("");
      setGross("");
      setTare("0");
    }
  }
  return (
    <section aria-labelledby="receive-title">
      <h2 id="receive-title">Registrar recepción completa</h2>
      <form onSubmit={submit}>
        <label>
          Pre-lote a recibir
          <select
            name="preLotId"
            value={preLotId}
            onChange={(e) => setPreLotId(e.target.value)}
            required
            disabled={busy}
          >
            <option value="">Seleccionar…</option>
            {origins.map((o) => (
              <option key={o.id} value={o.id}>
                {o.parcelName} · {o.quantity} {o.unit} · {o.id}
              </option>
            ))}
          </select>
        </label>
        {selected && (
          <p className="origin-summary">
            {selected.producerName} / {selected.parcelName}
            <br />
            Cosecha local: {selected.localHarvestDate} · Declarado:{" "}
            {selected.quantity} {selected.unit}
          </p>
        )}
        {!origins.length && (
          <p>No hay pre-lotes pendientes de recibir en la lista.</p>
        )}
        <label>
          Referencia de recepción
          <input name="reference" maxLength={120} required disabled={busy} />
        </label>
        <div className="coordinates">
          <label>
            Peso bruto (kg)
            <input
              name="grossKg"
              inputMode="decimal"
              value={gross}
              onChange={(e) => setGross(e.target.value)}
              pattern="(?:0|[1-9][0-9]{0,8})(?:\.[0-9]{1,3})?"
              required
              disabled={busy}
            />
          </label>
          <label>
            Tara (kg)
            <input
              name="tareKg"
              inputMode="decimal"
              value={tare}
              onChange={(e) => setTare(e.target.value)}
              pattern="(?:0|[1-9][0-9]{0,8})(?:\.[0-9]{1,3})?"
              required
              disabled={busy}
            />
          </label>
        </div>
        <p>
          Neto calculado: <strong>{preview(gross, tare)} kg</strong>
        </p>
        <label>
          Evidencia del pesaje
          <textarea
            name="evidence"
            maxLength={500}
            rows={2}
            required
            disabled={busy}
          />
        </label>
        <button disabled={busy || !origins.length}>Registrar recepción</button>
      </form>
    </section>
  );
}
