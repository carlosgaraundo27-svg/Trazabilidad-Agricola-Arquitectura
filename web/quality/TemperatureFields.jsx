import React from "react";
import {
  MetadataFields,
  TextField,
  blankMetadata,
} from "../measurements/ObservationFields.jsx";
export function TemperatureFields({
  capture,
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
          <p>Lectura posterior a consolidación</p>
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
