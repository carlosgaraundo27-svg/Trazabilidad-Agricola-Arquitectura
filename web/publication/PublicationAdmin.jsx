import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import { PublicationEditor } from "./PublicationEditor.jsx";
export function PublicationAdmin({ centers }) {
  const [centerId, setCenterId] = useState(centers[0].id),
    [lots, setLots] = useState(null),
    [offset, setOffset] = useState(0),
    [revision, setRevision] = useState(0),
    [item, setItem] = useState(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [pending, setPending] = useState(null);
  const actions = centers.find((c) => c.id === centerId)?.actions ?? [];
  useEffect(() => {
    let active = true;
    setLots(null);
    setError("");
    api(`/publications/lots?centerId=${centerId}&offset=${offset}`)
      .then((r) => {
        if (active) setLots(r.items);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [centerId, offset, revision]);
  async function load(id) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      setItem(await api("/publications/lots/" + id));
    } catch (e) {
      setItem(null);
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
      const result = await api(intent.path, {
        method: "POST",
        body: intent.body,
        key: intent.key,
      });
      setItem(result);
      setPending(null);
      setNotice(
        result.state === "withdrawn"
          ? "Publicación retirada."
          : "Publicación confirmada.",
      );
    } catch (e) {
      setError(e.message);
      setPending(!e.status || e.status >= 500 ? intent : null);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section aria-label="Administración de publicación">
      <h2>Publicación de trazabilidad</h2>
      <p>
        Revisa y aprueba únicamente la información que podrá consultar cualquier
        persona con el QR.
      </p>
      <label>
        <span>Centro de publicación</span>
        <select
          value={centerId}
          disabled={busy || !!pending || !!item}
          onChange={(e) => {
            setCenterId(e.target.value);
            setOffset(0);
          }}
        >
          {centers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      {error && <p role="alert">{error}</p>}
      {notice && <output>{notice}</output>}
      {busy && <output>Procesando publicación…</output>}
      {pending && (
        <output>
          No se pudo confirmar la respuesta.{" "}
          <button disabled={busy} onClick={() => execute(pending)}>
            Reintentar misma operación
          </button>
        </output>
      )}
      {!item ? (
        <>
          <button
            className="secondary"
            disabled={busy || !!pending}
            onClick={() => setRevision((n) => n + 1)}
          >
            Actualizar lotes
          </button>
          {lots === null && !error && <output>Consultando lotes…</output>}
          {lots?.length === 0 && <p>No hay lotes en esta página.</p>}
          <ul className="list">
            {lots?.map((l) => (
              <li key={l.id}>
                <span>
                  {l.lotCode ?? l.id} · {l.state}
                </span>
                <button disabled={busy || !!pending} onClick={() => load(l.id)}>
                  Administrar {l.id}
                </button>
              </li>
            ))}
          </ul>
          <div className="workspace-tabs">
            <button
              className="secondary"
              disabled={busy || offset === 0}
              onClick={() => setOffset((o) => Math.max(0, o - 100))}
            >
              Página anterior
            </button>
            <button
              className="secondary"
              disabled={busy || lots?.length !== 100}
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
              setItem(null);
              setNotice("");
              setRevision((n) => n + 1);
            }}
          >
            Volver a lotes
          </button>
          <h3>Lote {item.lotId}</h3>
          <PublicationEditor
            item={item}
            actions={actions}
            busy={busy}
            pending={pending}
            onCommand={(action, body) =>
              execute({
                path:
                  "/publications/lots/" +
                  item.lotId +
                  (action === "withdrawal" ? "/withdrawal" : ""),
                body,
                key: crypto.randomUUID(),
              })
            }
          />
          <button
            className="secondary"
            disabled={busy || !!pending}
            onClick={() => load(item.lotId)}
          >
            Consultar versión actual
          </button>
        </>
      )}
    </section>
  );
}
