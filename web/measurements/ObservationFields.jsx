import React from "react";
const localValue = (v) =>
  v
    ? new Intl.DateTimeFormat("sv-SE", {
        timeZone: "America/Lima",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        fractionalSecondDigits: 3,
        hour12: false,
      })
        .format(new Date(v))
        .replace(" ", "T")
        .replace(",", ".")
    : "";
export function TextField({ label, value, onChange, ...props }) {
  return (
    <label>
      {label}
      <input
        {...props}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
export function TimeField({ label, value, onChange }) {
  return (
    <TextField
      label={label + " (hora de Lima)"}
      type="datetime-local"
      step="0.001"
      value={localValue(value)}
      onChange={(v) => onChange(v ? new Date(v + "-05:00").toISOString() : "")}
    />
  );
}
export function MetadataFields({ value, onChange }) {
  const set = (name) => (v) => onChange({ ...value, [name]: v });
  return (
    <div className="quality-fields">
      <TimeField
        label="Momento de medición"
        value={value.measuredAt}
        onChange={set("measuredAt")}
      />
      <TextField
        label="Responsable de la observación"
        value={value.observedBy}
        onChange={set("observedBy")}
        maxLength={500}
      />
      <TextField
        label="Procedencia / evidencia original"
        value={value.provenance}
        onChange={set("provenance")}
        maxLength={500}
      />
      <TextField
        label="Método documentado"
        value={value.method}
        onChange={set("method")}
        maxLength={500}
      />
    </div>
  );
}
export const blankMetadata = () => ({
  measuredAt: "",
  observedBy: "",
  provenance: "",
  method: "",
});
