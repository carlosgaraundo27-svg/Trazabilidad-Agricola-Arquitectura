import React, { useEffect, useState } from "react";
import { api } from "./api.js";
import { Intake } from "./intake/Intake.jsx";
import { PublicationAdmin } from "./publication/PublicationAdmin.jsx";
export function Workspace({ user, origin }) {
  const [centers, setCenters] = useState(null),
    [error, setError] = useState(""),
    [tab, setTab] = useState(origin ? "origin" : null);
  useEffect(() => {
    let active = true;
    api("/intake/centers")
      .then((r) => {
        if (active) setCenters(r.items);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  const intake =
      centers?.filter((c) => c.actions.includes("intake:read")) ?? [],
    publication =
      centers?.filter((c) => c.actions.includes("publication:read")) ?? [];
  const active = tab ?? (intake.length ? "intake" : "publication");
  return (
    <>
      {error && <p role="alert">{error}</p>}
      {centers === null && !error && (
        <p role="status">Consultando centros autorizados…</p>
      )}
      {(origin || intake.length > 0 || publication.length > 0) && (
        <nav className="workspace-tabs" aria-label="Área de trabajo">
          {origin && (
            <button
              className="secondary"
              aria-pressed={active === "origin"}
              onClick={() => setTab("origin")}
            >
              Origen y cosecha
            </button>
          )}
          {intake.length > 0 && (
            <button
              className="secondary"
              aria-pressed={active === "intake"}
              onClick={() => setTab("intake")}
            >
              Acopio
            </button>
          )}
          {publication.length > 0 && (
            <button
              className="secondary"
              aria-pressed={active === "publication"}
              onClick={() => setTab("publication")}
            >
              Publicación QR
            </button>
          )}
        </nav>
      )}
      {active === "origin" ? (
        origin
      ) : active === "intake" && intake.length > 0 ? (
        <Intake user={user} centers={intake} />
      ) : publication.length > 0 ? (
        <PublicationAdmin centers={publication} />
      ) : (
        centers && (
          <p>Tu cuenta no tiene operaciones habilitadas en este recorrido.</p>
        )
      )}
    </>
  );
}
