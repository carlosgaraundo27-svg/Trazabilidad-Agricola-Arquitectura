import React, { useEffect, useState } from "react";
import { api } from "./api.js";
import { Intake } from "./intake/Intake.jsx";
import { Quality } from "./quality/Quality.jsx";
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
  const intakeCenters =
    centers?.filter((c) => c.actions.includes("intake:read")) ?? [];
  const qualityCenters =
    centers?.filter((c) => c.actions.includes("quality:read")) ?? [];
  const activeTab =
    !origin &&
    tab === "intake" &&
    !intakeCenters.length &&
    qualityCenters.length
      ? "quality"
      : tab;
  return (
    <>
      {error && <p role="alert">{error}</p>}
      {centers === null && !error && (
        <p role="status">Consultando centros autorizados…</p>
      )}
      {centers?.length > 0 && (
        <nav className="workspace-tabs" aria-label="Área de trabajo">
          {origin && (
            <button
              className="secondary"
              aria-pressed={tab === "origin"}
              onClick={() => setTab("origin")}
            >
              Origen y cosecha
            </button>
          )}
          {intakeCenters.length > 0 && (
            <button
              className="secondary"
              aria-pressed={tab === "intake"}
              onClick={() => setTab("intake")}
            >
              Acopio
            </button>
          )}
          {qualityCenters.length > 0 && (
            <button
              className="secondary"
              aria-pressed={activeTab === "quality"}
              onClick={() => setTab("quality")}
            >
              Calidad
            </button>
          )}
        </nav>
      )}
      {activeTab === "quality" && qualityCenters.length ? (
        <Quality key={user.id} centers={qualityCenters} />
      ) : activeTab === "origin" ? (
        origin
      ) : intakeCenters.length > 0 ? (
        <Intake user={user} centers={intakeCenters} />
      ) : (
        centers && (
          <p>Tu cuenta no tiene operaciones habilitadas en este recorrido.</p>
        )
      )}
    </>
  );
}
