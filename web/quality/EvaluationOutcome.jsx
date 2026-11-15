import React from "react";
const results = {
  accepted: "Aprobado",
  observed: "Observado",
  rejected: "Rechazado",
};
export function EvaluationOutcome({
  evaluation,
  actions,
  busy,
  pending,
  dirty,
  command,
}) {
  return (
    <>
      {evaluation.evaluationState === "closed" ? (
        <section>
          <h3>Resultado manual: {results[evaluation.qualityResult]}</h3>
          <p>{evaluation.note}</p>
          <p>
            Responsable autorizado: {evaluation.closedBy} ·{" "}
            {new Date(evaluation.closedAt).toLocaleString("es-PE")}
          </p>
          <p>
            Evaluación protegida. Sin reapertura ni reevaluación en este
            incremento.
          </p>
        </section>
      ) : (
        actions.includes("quality:close") && (
          <form
            aria-label="Cierre manual"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              command(
                "/quality/evaluations/" + evaluation.id + "/closure",
                "POST",
                {
                  expectedVersion: evaluation.version,
                  result: f.get("result"),
                  note: f.get("note"),
                },
              );
            }}
          >
            <fieldset disabled={busy || !!pending || dirty}>
              <legend>Resultado y cierre definitivo</legend>
              <p>
                Revise las mediciones guardadas. El resultado no se calcula
                automáticamente.
              </p>
              <label>
                Resultado manual
                <select name="result" required defaultValue="">
                  <option value="">Seleccionar resultado…</option>
                  {Object.entries(results).map(([v, n]) => (
                    <option value={v} key={v}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Justificación del responsable
                <textarea name="note" required maxLength={500} />
              </label>
              <button>Cerrar evaluación definitivamente</button>
            </fieldset>
            {dirty && <p>Guarde el borrador antes de cerrar.</p>}
          </form>
        )
      )}
    </>
  );
}
