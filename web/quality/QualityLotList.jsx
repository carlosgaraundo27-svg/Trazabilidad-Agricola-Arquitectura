import React from "react";
const results = {
  accepted: "Aprobado",
  observed: "Observado",
  rejected: "Rechazado",
};
export function QualityLotList({
  lots,
  actions,
  busy,
  pending,
  loadEvaluation,
  command,
}) {
  return (
    <ul className="lot-list">
      {lots?.map((l) => (
        <li key={l.id} data-testid="quality-lot">
          <h3>
            {l.totalKg} kg · {l.localHarvestDate}
          </h3>
          <small>{l.id}</small>
          <p>
            {l.contributions[0]?.origin.producerName} /{" "}
            {l.contributions[0]?.origin.parcelName}
          </p>
          <p>
            {l.evaluationState === "closed"
              ? results[l.qualityResult]
              : l.evaluationId
                ? "Borrador"
                : "Sin evaluación"}{" "}
            · Despacho no autorizado
          </p>
          {l.evaluationId ? (
            <button
              disabled={busy || !!pending}
              onClick={() => loadEvaluation(l)}
            >
              Consultar evaluación
            </button>
          ) : (
            actions.includes("quality:create") && (
              <button
                disabled={busy || !!pending}
                onClick={() =>
                  command("/quality/evaluations", "POST", { lotId: l.id }, l)
                }
              >
                Crear evaluación
              </button>
            )
          )}
        </li>
      ))}
    </ul>
  );
}
