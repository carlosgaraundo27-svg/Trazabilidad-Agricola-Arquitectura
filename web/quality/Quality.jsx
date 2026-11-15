import { QualityLotList } from "./QualityLotList.jsx";
import { EvaluationOutcome } from "./EvaluationOutcome.jsx";
import React, { useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import { CaptureForm } from "./CaptureForm.jsx";
import { ReceiptTemperatures } from "./ReceiptTemperatures.jsx";
export function Quality({ centers }) {
  const [centerId, setCenterId] = useState(centers[0].id),
    [lots, setLots] = useState(null),
    [offset, setOffset] = useState(0),
    [refresh, setRefresh] = useState(0),
    [evaluation, setEvaluation] = useState(null),
    [lot, setLot] = useState(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false),
    [pending, setPending] = useState(null);
  const focus = useRef(null);
  const actions = centers.find((c) => c.id === centerId)?.actions ?? [];
  useEffect(() => {
    let active = true;
    setLots(null);
    setEvaluation(null);
    setError("");
    api(`/quality/lots?centerId=${centerId}&offset=${offset}`)
      .then((r) => {
        if (active) setLots(r.items);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [centerId, offset, refresh]);
  useEffect(() => {
    focus.current?.focus();
  }, [evaluation?.id, evaluation?.version]);
  async function loadEvaluation(selected) {
    setBusy(true);
    setError("");
    try {
      setEvaluation(await api("/quality/evaluations/" + selected.evaluationId));
      setLot(selected);
      setDirty(false);
      setNotice("");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function execute(intent) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const item = await api(intent.path, {
        method: intent.method,
        body: intent.body,
        key: intent.key,
      });
      setEvaluation(item);
      setLot(intent.lot);
      setDirty(false);
      setPending(null);
      setNotice(
        item.evaluationState === "closed"
          ? "Evaluación cerrada. Despacho no autorizado."
          : "Borrador guardado.",
      );
      setLots((old) =>
        old?.map((l) =>
          l.id === item.lotId
            ? {
                ...l,
                evaluationId: item.id,
                evaluationState: item.evaluationState,
                qualityResult: item.qualityResult,
              }
            : l,
        ),
      );
    } catch (e) {
      setError(e.message);
      if (!e.status || e.status >= 500) setPending(intent);
      else setPending(null);
    } finally {
      setBusy(false);
    }
  }
  const command = (path, method, body, selected = lot) =>
    execute({ path, method, body, lot: selected, key: crypto.randomUUID() });
  return (
    <section aria-label="Calidad por lote">
      <h2 ref={focus} tabIndex={-1}>
        Calidad del prototipo académico
      </h2>
      <p>
        Decisión manual del responsable. Calidad e inventario son
        independientes; aprobar no autoriza despacho.
      </p>
      <label className="center-picker">
        Centro de Calidad
        <select
          value={centerId}
          disabled={busy || !!pending || !!evaluation}
          onChange={(e) => {
            setCenterId(e.target.value);
            setOffset(0);
          }}
        >
          {centers.map((c) => (
            <option value={c.id} key={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {pending && (
        <p role="status">
          La respuesta no pudo confirmarse.{" "}
          <button disabled={busy} onClick={() => execute(pending)}>
            Reintentar misma operación
          </button>
        </p>
      )}
      {busy && <p role="status">Procesando Calidad…</p>}
      {!evaluation ? (
        <>
          <button
            className="secondary"
            disabled={busy || !!pending}
            onClick={() => setRefresh((n) => n + 1)}
          >
            Actualizar lotes
          </button>
          {lots === null && !error && <p role="status">Consultando lotes…</p>}
          {lots?.length === 0 && (
            <p>No hay lotes consolidados en esta página.</p>
          )}
          <QualityLotList
            lots={lots}
            actions={actions}
            busy={busy}
            pending={pending}
            loadEvaluation={loadEvaluation}
            command={command}
          />
          <div className="workspace-tabs">
            <button
              className="secondary"
              disabled={busy || !!pending || offset === 0}
              onClick={() => setOffset((o) => Math.max(0, o - 100))}
            >
              Página anterior
            </button>
            <button
              className="secondary"
              disabled={busy || !!pending || lots?.length !== 100}
              onClick={() => setOffset((o) => o + 100)}
            >
              Página siguiente
            </button>
          </div>
        </>
      ) : (
        <>
          <button
            className="secondary"
            disabled={busy || !!pending}
            onClick={() => {
              setEvaluation(null);
              setNotice("");
              setError("");
              setDirty(false);
            }}
          >
            {dirty ? "Volver a lotes sin guardar" : "Volver a lotes"}
          </button>
          <h3>Evaluación {evaluation.id}</h3>
          <p>
            Lote {evaluation.lotId} · Versión {evaluation.version} ·{" "}
            {evaluation.evaluationState === "closed" ? "Cerrada" : "Borrador"}
          </p>
          <p>
            Descarte informativo guardado:{" "}
            {evaluation.discardPercentage ?? "Sin medición"}
            {evaluation.discardPercentage !== null ? " %" : ""}
          </p>
          <ReceiptTemperatures
            items={evaluation.receiptTemperatures}
            missing={evaluation.missingReceiptTemperatureIds}
          />
          <CaptureForm
            key={evaluation.id + ":" + evaluation.version}
            evaluation={evaluation}
            lot={lot}
            editable={
              evaluation.evaluationState === "draft" &&
              actions.includes("quality:update")
            }
            busy={busy || !!pending}
            onDirty={() => setDirty(true)}
            onSave={(capture) =>
              command("/quality/evaluations/" + evaluation.id, "PUT", {
                expectedVersion: evaluation.version,
                ...capture,
              })
            }
          />
          <EvaluationOutcome
            evaluation={evaluation}
            actions={actions}
            busy={busy}
            pending={pending}
            dirty={dirty}
            command={command}
          />
          <button
            className="secondary"
            disabled={busy || !!pending}
            onClick={() =>
              loadEvaluation({ ...lot, evaluationId: evaluation.id })
            }
          >
            Consultar versión actual desde servidor
          </button>
          <details>
            <summary>Historial de Calidad</summary>
            <ol>
              {evaluation.events.map((e) => (
                <li key={e.id}>
                  {e.kind} · v{e.version} ·{" "}
                  {new Date(e.occurredAt).toLocaleString("es-PE")}
                  <br />
                  <small>Responsable de registro: {e.actorId}</small>
                  <details>
                    <summary>Datos conservados del evento</summary>
                    <pre>{JSON.stringify(e.payload, null, 2)}</pre>
                  </details>
                </li>
              ))}
            </ol>
          </details>
        </>
      )}
    </section>
  );
}
