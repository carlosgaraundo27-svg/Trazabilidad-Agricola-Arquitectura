import React, { useEffect, useRef, useState } from "react";
import { api, listAll } from "../api.js";
import { ReceiptForm } from "./ReceiptForm.jsx";
import { ReceiptList } from "./ReceiptList.jsx";
import { Lots } from "./Lots.jsx";
export function Intake({ user, centers }) {
  const [centerId, setCenterId] = useState(centers[0].id),
    [data, setData] = useState({ origins: [], receipts: [], lots: [] }),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [selected, setSelected] = useState([]);
  const intent = useRef(null),
    inFlight = useRef(false);
  const actions = centers.find((c) => c.id === centerId)?.actions ?? [];
  async function read(center) {
    const query = "?centerId=" + encodeURIComponent(center);
    const [origins, receipts, lots] = await Promise.all([
      listAll("/intake/origins" + query),
      listAll("/intake/receipts" + query),
      listAll("/lots" + query),
    ]);
    return { origins, receipts, lots };
  }
  useEffect(() => {
    let current = true;
    setBusy(true);
    setError("");
    setMessage("");
    setSelected([]);
    setData({ origins: [], receipts: [], lots: [] });
    read(centerId)
      .then((value) => {
        if (current) setData(value);
      })
      .catch((e) => {
        if (current) setError(e.message);
      })
      .finally(() => {
        if (current) setBusy(false);
      });
    return () => {
      current = false;
    };
  }, [centerId]);
  async function command(path, body, success) {
    if (inFlight.current) return false;
    inFlight.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    const signature = JSON.stringify({ path, body });
    if (intent.current?.signature !== signature)
      intent.current = { signature, key: crypto.randomUUID() };
    try {
      const result = await api(path, {
        method: "POST",
        body,
        key: intent.current.key,
      });
      setMessage(success + ": " + result.id);
      setData(await read(centerId));
      setSelected([]);
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  const eligible = data.origins.filter(
    (o) => !data.receipts.some((r) => r.preLotId === o.id),
  );
  return (
    <>
      <p className="eyebrow">03 / ACOPIO</p>
      <h1>Recepción y consolidación</h1>
      <p>
        Recibe cada pre-lote, revisa las diferencias y conserva el origen al
        consolidar.
      </p>
      <label className="center-picker">
        Centro de recepción
        <select
          value={centerId}
          onChange={(e) => setCenterId(e.target.value)}
          disabled={busy}
        >
          {centers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <p role="alert">{error}</p>
      <p role="status">{busy ? "Procesando…" : message}</p>
      {error && (
        <button
          className="secondary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              setData(await read(centerId));
              setSelected([]);
              setError("");
            } catch (e) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          Actualizar datos
        </button>
      )}
      <div className="intake-layout">
        {actions.includes("intake:receive") && (
          <ReceiptForm
            key={centerId}
            origins={eligible}
            busy={busy}
            onReceive={(values) =>
              command(
                "/intake/receipts",
                { centerId, ...values },
                "Recepción registrada",
              )
            }
          />
        )}
        <div>
          <ReceiptList
            receipts={data.receipts}
            actions={actions}
            user={user}
            busy={busy}
            selected={selected}
            onSelect={(id, checked) =>
              setSelected((old) =>
                checked ? [...old, id] : old.filter((x) => x !== id),
              )
            }
            onCommand={command}
          />
          {actions.includes("lot:consolidate") && (
            <div className="consolidation">
              <p>
                Se aporta el saldo completo de {selected.length} recepción(es).
                Deben compartir productor, parcela, fecha local, organización y
                centro.
              </p>
              <button
                disabled={busy || !selected.length}
                onClick={() =>
                  command(
                    "/lots",
                    { centerId, receiptIds: [...selected].sort() },
                    "Lote consolidado",
                  )
                }
              >
                Consolidar seleccionadas
              </button>
            </div>
          )}
        </div>
      </div>
      <Lots lots={data.lots} receipts={data.receipts} />
    </>
  );
}
