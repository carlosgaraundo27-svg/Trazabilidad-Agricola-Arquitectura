import React, { useEffect, useState } from "react";
const stageNames = {
  harvest: "Cosecha",
  reception: "Recepción",
  consolidation: "Consolidación",
};
export function PublicPage({ id }) {
  const [item, setItem] = useState(null),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setItem(null);
    setError("");
    fetch("/api/public/v1/lots/" + encodeURIComponent(id), {
      credentials: "omit",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (r) => {
        if (!r.ok)
          throw Error(
            r.status === 404
              ? "Esta trazabilidad no está disponible."
              : r.status === 429
                ? "Demasiadas consultas. Intenta de nuevo en un minuto."
                : "No pudimos consultar la trazabilidad. Intenta de nuevo.",
          );
        const value = await r.json();
        if (!controller.signal.aborted) setItem(value);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [id, revision]);
  useEffect(() => {
    const onVisibility = () => {
      setItem(null);
      if (document.visibilityState === "visible") setRevision((n) => n + 1);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);
  return (
    <>
      <a className="skip" href="#public-main">
        Ir al contenido
      </a>
      <header>
        <a className="brand" href="/">
          TRAZA<span> / agrícola</span>
        </a>
        <span>Consulta pública</span>
      </header>
      <main id="public-main" className="public-journey">
        <p className="eyebrow">DEL LOTE A SU RECORRIDO</p>
        {error ? (
          <>
            <h1>Trazabilidad no disponible</h1>
            <p role="alert">{error}</p>
          </>
        ) : !item ? (
          <>
            <h1>Consulta de trazabilidad</h1>
            <output>Consultando publicación vigente…</output>
          </>
        ) : (
          <>
            <h1>Lote {item.lotCode}</h1>
            <p>Etapas y descripciones públicas revisadas por el centro.</p>
            <ol className="public-timeline">
              {item.stages.map((s, index) => (
                <li key={s.stage + ":" + s.date + ":" + index}>
                  <div>
                    <span className="eyebrow">{stageNames[s.stage]}</span>
                    <h2>
                      <time dateTime={s.date}>
                        {s.date.split("-").reverse().join("/")}
                      </time>
                    </h2>
                  </div>
                  <p>{s.description}</p>
                </li>
              ))}
            </ol>
          </>
        )}
        <button className="secondary" onClick={() => setRevision((n) => n + 1)}>
          Actualizar consulta
        </button>
        <aside className="public-scope">
          <h2>Sobre esta consulta</h2>
          <p>
            La publicación de trazabilidad no equivale a aprobar la calidad del
            lote.
          </p>
          <p>
            Prototipo académico · Datos ficticios de demostración · Sin
            validación agrícola.
          </p>
        </aside>
      </main>
    </>
  );
}
