import React, { useEffect, useState } from "react";
import { api } from "./api.js";
import { Intake } from "./intake/Intake.jsx";
export function Workspace({ user, origin }) {
  const [centers, setCenters] = useState(null),
    [error, setError] = useState(""),
    [tab, setTab] = useState(origin ? "origin" : "intake");
  useEffect(() => {
    let active = true;
    api("/intake/centers")
      .then((result) => {
        if (active) setCenters(result.items);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  return (
    <>
      {error && <p role="alert">{error}</p>}
      {centers === null && !error && (
        <p role="status">Consultando centros autorizados…</p>
      )}
      {centers?.length > 0 && origin && (
        <nav className="workspace-tabs" aria-label="Área de trabajo">
          <button
            className="secondary"
            aria-pressed={tab === "origin"}
            onClick={() => setTab("origin")}
          >
            Origen y cosecha
          </button>
          <button
            className="secondary"
            aria-pressed={tab === "intake"}
            onClick={() => setTab("intake")}
          >
            Acopio
          </button>
        </nav>
      )}
      {tab === "origin" ? (
        origin
      ) : centers?.length > 0 ? (
        <Intake user={user} centers={centers} />
      ) : (
        centers && (
          <p>Tu cuenta no tiene operaciones habilitadas en este recorrido.</p>
        )
      )}
    </>
  );
}
