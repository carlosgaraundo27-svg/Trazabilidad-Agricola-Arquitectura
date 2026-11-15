import React from "react";
import {
  MetadataFields,
  TextField,
  blankMetadata,
} from "../measurements/ObservationFields.jsx";
export function ReceiptTemperatureFields({ value, onChange, busy }) {
  return (
    <fieldset disabled={busy}>
      <legend>Temperatura original de recepción</legend>
      <label className="selection">
        <input
          type="checkbox"
          checked={value !== null}
          onChange={(e) =>
            onChange(
              e.target.checked
                ? { ...blankMetadata(), value: "", unit: "°C" }
                : null,
            )
          }
        />
        Documentar temperatura original
      </label>
      <p>
        Registre solo la lectura original con su evidencia. Sin este dato,
        Calidad no podrá cerrar el lote. Una vez registrada la recepción, este
        incremento no permite completar ni corregir su temperatura.
      </p>
      {value && (
        <>
          <TextField
            label="Temperatura original (°C)"
            value={value.value}
            onChange={(v) => onChange({ ...value, value: v })}
            inputMode="decimal"
          />
          <MetadataFields value={value} onChange={onChange} />
          <p>
            El responsable y la fecha de registro quedan asociados a tu sesión
            automáticamente.
          </p>
        </>
      )}
    </fieldset>
  );
}
