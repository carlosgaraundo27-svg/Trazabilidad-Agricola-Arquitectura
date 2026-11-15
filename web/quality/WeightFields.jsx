import React from "react";
import {
  MetadataFields,
  TextField,
  blankMetadata,
} from "../measurements/ObservationFields.jsx";
export function WeightFields({
  capture,
  editable,
  busy,
  arrayChange,
  remove,
  change,
}) {
  return (
    <fieldset disabled={!editable || busy}>
      <legend>Calibre académico: peso individual</legend>
      <p>g/fruto; sin categoría comercial ni conversión de unidades.</p>
      {capture.weights.map((w, i) => (
        <section
          className="quality-observation"
          key={i}
          aria-label={"Peso " + (i + 1)}
        >
          <h3>Fruto {i + 1}</h3>
          <TextField
            label="Referencia de fruto"
            value={w.fruitReference}
            onChange={(v) =>
              arrayChange("weights", i, { ...w, fruitReference: v })
            }
            maxLength={120}
          />
          <TextField
            label="Peso individual (g/fruto)"
            value={w.value}
            onChange={(v) => arrayChange("weights", i, { ...w, value: v })}
            inputMode="decimal"
          />
          <MetadataFields
            value={w}
            onChange={(v) => arrayChange("weights", i, v)}
          />
          {editable && (
            <button
              type="button"
              className="secondary"
              onClick={() => remove("weights", i)}
            >
              Quitar peso {i + 1}
            </button>
          )}
        </section>
      ))}
      {editable && (
        <button
          type="button"
          className="secondary"
          disabled={capture.weights.length >= 100}
          onClick={() =>
            change("weights", [
              ...capture.weights,
              {
                ...blankMetadata(),
                fruitReference: "",
                value: "",
                unit: "g/fruto",
              },
            ])
          }
        >
          Añadir peso
        </button>
      )}
    </fieldset>
  );
}
