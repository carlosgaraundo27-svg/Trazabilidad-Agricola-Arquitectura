import React, { useEffect, useState } from "react";
import { api } from "./api.js";
import { Intake } from "./intake/Intake.jsx";
import { Quality } from "./quality/Quality.jsx";
import { PublicationAdmin } from "./publication/PublicationAdmin.jsx";
import { Logistics } from "./logistics/Logistics.jsx";
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
  const scoped = (action) =>
    centers?.filter((c) => c.actions.includes(action)) ?? [];
  const intake = scoped("intake:read"),
    quality = scoped("quality:read"),
    publication = scoped("publication:read");
  const views = [];
  const logistics =
    centers?.filter(
      (c) =>
        c.actions.includes("inventory:read") ||
        c.actions.includes("shipment:read"),
    ) ?? [];
  if (logistics.length)
    views.push({
      id: "logistics",
      label: "Inventario y despachos",
      content: <Logistics centers={logistics} />,
    });
  if (origin)
    views.push({ id: "origin", label: "Origen y cosecha", content: origin });
  if (intake.length)
    views.push({
      id: "intake",
      label: "Acopio",
      content: <Intake user={user} centers={intake} />,
    });
  if (quality.length)
    views.push({
      id: "quality",
      label: "Calidad",
      content: <Quality key={user.id} centers={quality} />,
    });
  if (publication.length)
    views.push({
      id: "publication",
      label: "Publicación QR",
      content: <PublicationAdmin centers={publication} />,
    });
  const active = tab ?? views[0]?.id,
    current = views.find((view) => view.id === active);
  return (
    <>
      {error && <p role="alert">{error}</p>}
      {centers === null && !error && (
        <output>Consultando centros autorizados…</output>
      )}
      {views.length > 0 && (
        <nav className="workspace-tabs" aria-label="Área de trabajo">
          {views.map((view) => (
            <button
              type="button"
              key={view.id}
              className="secondary"
              aria-pressed={active === view.id}
              onClick={() => setTab(view.id)}
            >
              {view.label}
            </button>
          ))}
        </nav>
      )}
      {current?.content}
      {centers && views.length === 0 && (
        <p>Tu cuenta no tiene operaciones habilitadas en este recorrido.</p>
      )}
    </>
  );
}
