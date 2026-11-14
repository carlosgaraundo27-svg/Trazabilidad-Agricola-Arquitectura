import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { api, listAll, setSession } from "./api.js";
import "./style.css";
function Field({ label, ...props }) {
  return (
    <label>
      {label}
      <input {...props} />
    </label>
  );
}
function Select({ label, children, ...props }) {
  return (
    <label>
      {label}
      <select {...props}>
        <option value="">Seleccionar…</option>
        {children}
      </select>
    </label>
  );
}
function Login({ onLogin }) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      onLogin(await api("/auth/login", { method: "POST", body: values }));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="login">
      <p className="eyebrow">DEL CAMPO AL ORIGEN</p>
      <h1>La trazabilidad empieza aquí.</h1>
      <p>Identifica el origen y registra la cosecha de forma segura.</p>
      <form onSubmit={submit}>
        <h2>Iniciar sesión</h2>
        <Field
          label="Correo electrónico"
          name="email"
          type="email"
          autoComplete="username"
          required
        />
        <Field
          label="Contraseña"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
        <p role="alert">{error}</p>
        <button disabled={busy}>{busy ? "Ingresando…" : "Ingresar"}</button>
      </form>
      <p className="muted">Entorno de demostración · Solo datos ficticios</p>
    </section>
  );
}
function Admin() {
  const [producers, setProducers] = useState([]),
    [parcels, setParcels] = useState([]),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(true);
  async function load() {
    const [p, r] = await Promise.all([
      listAll("/producers"),
      listAll("/parcels"),
    ]);
    setProducers(p);
    setParcels(r);
  }
  useEffect(() => {
    load()
      .catch((e) => setError(e.message))
      .finally(() => setBusy(false));
  }, []);
  async function create(event, path) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    if (path === "/parcels") {
      values.latitude = Number(values.latitude);
      values.longitude = Number(values.longitude);
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const item = await api(path, { method: "POST", body: values });
      form.reset();
      setMessage("Registro guardado: " + item.name);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <p className="eyebrow">01 / ORIGEN</p>
      <h1>Productores y parcelas</h1>
      <p>Registra el origen geográfico antes de capturar una cosecha.</p>
      <p role="alert">{error}</p>
      <p role="status">{message || (busy ? "Cargando…" : "")}</p>
      <div className="columns">
        <section>
          <h2>Registrar productor</h2>
          <form onSubmit={(e) => create(e, "/producers")}>
            <Field
              label="Nombre del productor"
              name="name"
              maxLength={120}
              required
            />
            <button disabled={busy}>Guardar productor</button>
          </form>
        </section>
        <section>
          <h2>Registrar parcela</h2>
          <form onSubmit={(e) => create(e, "/parcels")}>
            <Select label="Productor de la parcela" name="producerId" required>
              {producers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
            <Field
              label="Nombre de la parcela"
              name="name"
              maxLength={120}
              required
            />
            <div className="coordinates">
              <Field
                label="Latitud"
                name="latitude"
                type="number"
                min="-90"
                max="90"
                step="any"
                required
              />
              <Field
                label="Longitud"
                name="longitude"
                type="number"
                min="-180"
                max="180"
                step="any"
                required
              />
            </div>
            <button disabled={busy || !producers.length}>
              Guardar parcela
            </button>
          </form>
        </section>
      </div>
      <section className="register">
        <h2>
          Parcelas registradas <span className="count">{parcels.length}</span>
        </h2>
        {!parcels.length ? (
          <p>Aún no hay parcelas. Registra un productor para comenzar.</p>
        ) : (
          <ul>
            {parcels.map((p) => (
              <li key={p.id}>
                <strong>{p.name}</strong>
                <span>
                  {producers.find((x) => x.id === p.producerId)?.name}
                </span>
                <small>
                  {p.latitude}, {p.longitude}
                </small>
              </li>
            ))}
          </ul>
        )}
        <p className="muted">
          La asignación de recolectores se prepara mediante los datos de
          demostración.
        </p>
      </section>
    </>
  );
}
function Harvest() {
  const [producers, setProducers] = useState([]),
    [parcels, setParcels] = useState([]),
    [lots, setLots] = useState([]),
    [producer, setProducer] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(true),
    [saved, setSaved] = useState(null);
  const attempt = useRef(null),
    confirmation = useRef(null);
  async function load() {
    const [p, r, l] = await Promise.all([
      listAll("/producers"),
      listAll("/parcels"),
      listAll("/pre-lots"),
    ]);
    setProducers(p);
    setParcels(r);
    setLots(l);
  }
  useEffect(() => {
    load()
      .catch((e) => setError(e.message))
      .finally(() => setBusy(false));
  }, []);
  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    delete values.producerId;
    values.harvestedAt = new Date(values.harvestedAt).toISOString();
    const signature = JSON.stringify(values);
    if (attempt.current?.signature !== signature)
      attempt.current = { signature, key: crypto.randomUUID() };
    setBusy(true);
    setError("");
    try {
      const item = await api("/pre-lots", {
        method: "POST",
        body: values,
        key: attempt.current.key,
      });
      setSaved(item);
      attempt.current = null;
      form.reset();
      setProducer("");
      await load();
      setTimeout(() => confirmation.current?.focus(), 0);
    } catch (e) {
      setError(e.message + " Puedes reintentar con los mismos datos.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <p className="eyebrow">02 / COSECHA EN LÍNEA</p>
      <h1>Registrar pre-lote</h1>
      <p>Cada registro conserva su parcela de origen y responsable.</p>
      <p role="alert">{error}</p>
      {saved && (
        <section
          className="confirmation"
          role="status"
          tabIndex="-1"
          ref={confirmation}
        >
          <h2>Pre-lote registrado</h2>
          <p>
            Identificador <code data-testid="prelot-id">{saved.id}</code>
          </p>
          <p>
            {saved.quantity} {saved.unit} · {saved.status}
          </p>
        </section>
      )}
      <div className="columns">
        <section>
          <h2>Datos de cosecha</h2>
          {busy && <p role="status">Cargando…</p>}
          <form onSubmit={submit}>
            <Select
              label="Productor"
              name="producerId"
              value={producer}
              onChange={(e) => setProducer(e.target.value)}
              required
            >
              {producers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
            <Select
              label="Parcela asignada"
              name="parcelId"
              key={producer}
              required
              disabled={!producer}
            >
              {parcels
                .filter((p) => p.producerId === producer)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </Select>
            <Field
              label="Fecha y hora de cosecha"
              name="harvestedAt"
              type="datetime-local"
              required
            />
            <div className="coordinates">
              <Field
                label="Cantidad declarada"
                name="quantity"
                type="number"
                min="0.001"
                max="999999999.999"
                step="0.001"
                required
              />
              <Select label="Unidad" name="unit" required>
                <option value="kg">kg</option>
                <option value="unidad">unidad</option>
              </Select>
            </div>
            <p className="muted">
              Cantidad declarada en campo. El pesaje oficial se registra en
              acopio.
            </p>
            <button disabled={busy || !parcels.length}>
              Registrar pre-lote
            </button>
          </form>
          {!busy && !parcels.length && (
            <p>
              No tienes parcelas asignadas. Solicita una asignación al
              administrador.
            </p>
          )}
        </section>
        <section className="register">
          <h2>
            Registros de tus parcelas{" "}
            <span className="count">{lots.length}</span>
          </h2>
          {!lots.length ? (
            <p>Aún no hay pre-lotes registrados.</p>
          ) : (
            <ul>
              {lots.map((p) => (
                <li key={p.id}>
                  <strong>
                    {parcels.find((x) => x.id === p.parcelId)?.name}
                  </strong>
                  <span>
                    {p.quantity} {p.unit} ·{" "}
                    {new Date(p.harvestedAt).toLocaleString("es-PE")}
                  </span>
                  <small>{p.id}</small>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
function App() {
  const [session, setCurrentSession] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  function acceptSession(value) {
    setSession(value);
    setCurrentSession(value);
  }
  useEffect(() => {
    api("/auth/me")
      .then(acceptSession)
      .catch((e) => {
        if (e.status !== 401) setError(e.message);
      })
      .finally(() => setLoading(false));
  }, []);
  async function logout() {
    try {
      await api("/auth/logout", { method: "POST", body: {} });
      acceptSession(null);
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <>
      <a className="skip" href="#main">
        Ir al contenido
      </a>
      <header>
        <a className="brand" href="/">
          TRAZA<span> / agrícola</span>
        </a>
        {session && (
          <div className="identity">
            <span>{session.user.email}</span>
            <button className="secondary" onClick={logout}>
              Cerrar sesión
            </button>
          </div>
        )}
      </header>
      <main id="main">
        <p role="alert">{error}</p>
        {loading ? (
          <p role="status">Verificando sesión…</p>
        ) : !session ? (
          <Login onLogin={acceptSession} />
        ) : session.user.role === "admin" ? (
          <Admin />
        ) : session.user.role === "collector" ? (
          <Harvest />
        ) : (
          <p>Tu cuenta no tiene operaciones habilitadas en este recorrido.</p>
        )}
      </main>
      <footer>Origen verificable · Demostración con datos ficticios</footer>
    </>
  );
}
createRoot(document.getElementById("root")).render(<App />);
