import React from "react";
import {
  MetadataFields,
  TextField,
  blankMetadata,
} from "./ObservationFields.jsx";
export function TemperatureFields({
  capture,
  lot,
  editable,
  busy,
  arrayChange,
  remove,
  change,
}) {
  return (
    <fieldset disabled={!editable || busy}>
      <legend>Temperaturas y procedencia</legend>
      <p>
        Una lectura posterior no sustituye una temperatura original de
        recepción. No se promedian recepciones.
      </p>
      {capture.temperatures.map((temp, i) => (
        <section
          className="quality-observation"
          key={i}
          aria-label={"Temperatura " + (i + 1)}
        >
          <h3>Lectura {i + 1}</h3>
          <label>
            Etapa
            <select
              value={temp.stage}
              onChange={(e) =>
                arrayChange("temperatures", i, {
                  ...temp,
                  stage: e.target.value,
                  sourceReceiptId: null,
                })
              }
            >
              <option value="post_consolidation">
                Posterior a consolidación
              </option>
              <option value="receipt">Original documentada de recepción</option>
            </select>
          </label>
          {temp.stage === "receipt" && (
            <label>
              Recepción aportante
              <select
                value={temp.sourceReceiptId ?? ""}
                onChange={(e) =>
                  arrayChange("temperatures", i, {
                    ...temp,
                    sourceReceiptId: e.target.value || null,
                  })
                }
              >
                <option value="">Seleccionar recepción…</option>
                {lot.contributions.map((c) => (
                  <option key={c.receiptId} value={c.receiptId}>
                    {c.receiptId}
                  </option>
                ))}
              </select>
            </label>
          )}
          <TextField
            label="Temperatura (°C)"
            value={temp.value}
            onChange={(v) =>
              arrayChange("temperatures", i, { ...temp, value: v })
            }
            inputMode="decimal"
          />
          <MetadataFields
            value={temp}
            onChange={(v) => arrayChange("temperatures", i, v)}
          />
          {editable && (
            <button
              type="button"
              className="secondary"
              onClick={() => remove("temperatures", i)}
            >
              Quitar temperatura {i + 1}
            </button>
          )}
        </section>
      ))}
      {editable && (
        <button
          type="button"
          className="secondary"
          disabled={capture.temperatures.length >= 100}
          onClick={() =>
            change("temperatures", [
              ...capture.temperatures,
              {
                ...blankMetadata(),
                value: "",
                unit: "°C",
                stage: "post_consolidation",
                sourceReceiptId: null,
              },
            ])
          }
        >
          Añadir temperatura
        </button>
      )}
    </fieldset>
  );
}
