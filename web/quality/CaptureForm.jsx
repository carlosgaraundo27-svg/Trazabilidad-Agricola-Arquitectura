import { TemperatureFields } from "./TemperatureFields.jsx";
import { DryDiscardFields } from "./DryDiscardFields.jsx";
import { WeightFields } from "./WeightFields.jsx";
import React, { useState } from "react";
import { TextField, TimeField } from "./ObservationFields.jsx";
export function CaptureForm({
  evaluation,
  lot,
  editable,
  busy,
  onSave,
  onDirty,
}) {
  const [capture, setCapture] = useState(evaluation.capture);
  const change = (name, value) => {
    setCapture((old) => ({ ...old, [name]: value }));
    onDirty();
  };
  const arrayChange = (name, index, value) =>
    change(
      name,
      capture[name].map((x, i) => (i === index ? value : x)),
    );
  const remove = (name, index) =>
    change(
      name,
      capture[name].filter((_, i) => i !== index),
    );
  const scalar = (name, field, value) =>
    change(name, { ...capture[name], [field]: value });
  const sample = capture.sample;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(capture);
      }}
      aria-label="Captura de calidad"
    >
      <fieldset disabled={!editable || busy}>
        <legend>Muestra del lote</legend>
        <p>
          Observaciones académicas. No se afirma representatividad estadística.
        </p>
        {!sample ? (
          <button
            type="button"
            className="secondary"
            onClick={() =>
              change("sample", {
                reference: "",
                sampledAt: "",
                sampledBy: "",
                provenance: "",
              })
            }
          >
            Identificar muestra
          </button>
        ) : (
          <div className="quality-fields">
            <TextField
              label="Referencia de muestra"
              value={sample.reference}
              onChange={(v) => scalar("sample", "reference", v)}
              maxLength={120}
            />
            <TimeField
              label="Fecha de muestra"
              value={sample.sampledAt}
              onChange={(v) => scalar("sample", "sampledAt", v)}
            />
            <TextField
              label="Responsable de muestra"
              value={sample.sampledBy}
              onChange={(v) => scalar("sample", "sampledBy", v)}
              maxLength={500}
            />
            <TextField
              label="Procedencia de muestra"
              value={sample.provenance}
              onChange={(v) => scalar("sample", "provenance", v)}
              maxLength={500}
            />
          </div>
        )}
      </fieldset>
      <WeightFields
        capture={capture}
        editable={editable}
        busy={busy}
        arrayChange={arrayChange}
        remove={remove}
        change={change}
      />
      <DryDiscardFields
        capture={capture}
        editable={editable}
        busy={busy}
        scalar={scalar}
        change={change}
      />
      <TemperatureFields
        capture={capture}
        lot={lot}
        editable={editable}
        busy={busy}
        arrayChange={arrayChange}
        remove={remove}
        change={change}
      />
      {editable && <button disabled={busy}>Guardar borrador</button>}
    </form>
  );
}
