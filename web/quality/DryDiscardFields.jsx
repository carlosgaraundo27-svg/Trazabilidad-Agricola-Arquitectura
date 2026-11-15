import React from "react";
import {
  MetadataFields,
  TextField,
  blankMetadata,
} from "./ObservationFields.jsx";
export function DryDiscardFields({ capture, editable, busy, scalar, change }) {
  return (
    <fieldset disabled={!editable || busy}>
      <legend>Materia seca y descarte de muestra</legend>
      {!capture.dryMatter ? (
        <button
          type="button"
          className="secondary"
          onClick={() =>
            change("dryMatter", { ...blankMetadata(), value: "", unit: "%" })
          }
        >
          Añadir materia seca
        </button>
      ) : (
        <section className="quality-observation" aria-label="Materia seca">
          <h3>Materia seca</h3>
          <p>Porcentaje de masa seca respecto de masa fresca de la muestra.</p>
          <TextField
            label="Materia seca (%)"
            value={capture.dryMatter.value}
            onChange={(v) => scalar("dryMatter", "value", v)}
            inputMode="decimal"
          />
          <MetadataFields
            value={capture.dryMatter}
            onChange={(v) => change("dryMatter", v)}
          />
        </section>
      )}
      {!capture.discard ? (
        <button
          type="button"
          className="secondary"
          onClick={() =>
            change("discard", {
              ...blankMetadata(),
              inspectedCount: "",
              discardedCount: "",
              unit: "frutos",
            })
          }
        >
          Añadir conteos
        </button>
      ) : (
        <section
          className="quality-observation"
          aria-label="Descarte de muestra"
        >
          <h3>Conteos de muestra</h3>
          <TextField
            label="Frutos examinados"
            value={capture.discard.inspectedCount}
            onChange={(v) =>
              scalar("discard", "inspectedCount", v === "" ? "" : Number(v))
            }
            type="number"
            min="1"
            max="1000000"
            step="1"
          />
          <TextField
            label="Frutos descartados"
            value={capture.discard.discardedCount}
            onChange={(v) =>
              scalar("discard", "discardedCount", v === "" ? "" : Number(v))
            }
            type="number"
            min="0"
            max="1000000"
            step="1"
          />
          <MetadataFields
            value={capture.discard}
            onChange={(v) => change("discard", v)}
          />
          <p>
            El porcentaje es informativo. No descuenta inventario ni extrapola
            kilos.
          </p>
        </section>
      )}
    </fieldset>
  );
}
