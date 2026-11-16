import React, { useEffect, useState } from "react";
const stageNames = {
  harvest: "Cosecha",
  reception: "Recepción",
  consolidation: "Consolidación",
};
const newStage = () => ({
  key: crypto.randomUUID(),
  stage: "harvest",
  date: "",
  description: "",
});
export function PublicationEditor({ item, actions, busy, pending, onCommand }) {
  const [code, setCode] = useState(""),
    [stages, setStages] = useState([]),
    [approved, setApproved] = useState(false);
  useEffect(() => {
    setCode(item.content?.lotCode ?? "");
    setStages(
      item.content?.stages.map((s) => ({ ...s, key: crypto.randomUUID() })) ?? [
        newStage(),
      ],
    );
    setApproved(false);
  }, [item.lotId, item.version]);
  const change = (key, name, value) => {
    setStages((old) =>
      old.map((s) => (s.key === key ? { ...s, [name]: value } : s)),
    );
    setApproved(false);
  };
  return (
    <>
      <p>
        Estado:{" "}
        <strong>
          {item.state === "published"
            ? "Publicada"
            : item.state === "withdrawn"
              ? "Retirada"
              : "Sin publicar"}
        </strong>{" "}
        · Versión {item.version}
      </p>
      <p>Publicar trazabilidad no aprueba Calidad ni habilita despacho.</p>
      <form
        aria-label="Campos de publicación"
        onSubmit={(e) => {
          e.preventDefault();
          if (approved)
            onCommand("publish", {
              expectedVersion: item.version,
              lotCode: code,
              stages: stages.map(({ stage, date, description }) => ({
                stage,
                date,
                description,
              })),
            });
        }}
      >
        <fieldset
          disabled={
            busy || !!pending || !actions.includes("publication:publish")
          }
        >
          <legend>Campos públicos revisados</legend>
          <label>
            Código público del lote
            <input
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setApproved(false);
              }}
              pattern="[A-Za-z0-9_-]{1,80}"
              maxLength={80}
              required
            />
          </label>
          {stages.map((s) => (
            <fieldset className="public-stage-editor" key={s.key}>
              <legend>Etapa pública</legend>
              <label>
                Etapa
                <select
                  value={s.stage}
                  onChange={(e) => change(s.key, "stage", e.target.value)}
                >
                  {Object.entries(stageNames).map(([key, name]) => (
                    <option key={key} value={key}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Fecha pública
                <input
                  type="date"
                  value={s.date}
                  max={new Date().toISOString().slice(0, 10)}
                  required
                  onChange={(e) => change(s.key, "date", e.target.value)}
                />
              </label>
              <label>
                Descripción pública aprobada
                <textarea
                  value={s.description}
                  maxLength={500}
                  required
                  onChange={(e) => change(s.key, "description", e.target.value)}
                />
              </label>
              <button
                type="button"
                className="secondary"
                disabled={stages.length <= 1}
                onClick={() => {
                  setStages((old) => old.filter((v) => v.key !== s.key));
                  setApproved(false);
                }}
              >
                Quitar etapa
              </button>
            </fieldset>
          ))}
          <button
            type="button"
            className="secondary"
            disabled={stages.length >= 20}
            onClick={() => {
              setStages((old) => [...old, newStage()]);
              setApproved(false);
            }}
          >
            Añadir etapa pública
          </button>
          <p>
            No incluyas contactos, finanzas, credenciales, identificadores de
            usuarios ni notas privadas. Los eventos internos no se publican
            automáticamente.
          </p>
          <label className="publication-approval">
            <input
              type="checkbox"
              checked={approved}
              onChange={(e) => setApproved(e.target.checked)}
              required
            />
            He revisado estos campos y apruebo su publicación sin información
            privada.
          </label>
          <button disabled={!approved}>Publicar campos revisados</button>
        </fieldset>
      </form>
      {item.state === "published" && (
        <section aria-label="Enlace y QR públicos">
          <h3>Consulta del lote</h3>
          <a href={item.url} target="_blank" rel="noreferrer">
            Abrir consulta pública
          </a>
          <p className="public-url">{item.url}</p>
          <img
            className="publication-qr"
            src={"/api/v1/publications/lots/" + item.lotId + "/qr"}
            alt="QR del lote publicado"
            width="320"
            height="320"
          />
          <p>
            <a
              href={"/api/v1/publications/lots/" + item.lotId + "/qr"}
              download="lote-qr.png"
            >
              Descargar QR
            </a>
          </p>
          {actions.includes("publication:withdraw") && (
            <button
              disabled={busy || !!pending}
              onClick={() =>
                onCommand("withdrawal", { expectedVersion: item.version })
              }
            >
              Retirar publicación
            </button>
          )}
        </section>
      )}
      <details>
        <summary>Historial interno de publicación</summary>
        <ol>
          {item.history.map((h) => (
            <li key={h.version}>
              Versión {h.version} · {h.state} ·{" "}
              {new Date(h.occurredAt).toLocaleString("es-PE")} · Responsable{" "}
              {h.actorId}
            </li>
          ))}
        </ol>
      </details>
    </>
  );
}
