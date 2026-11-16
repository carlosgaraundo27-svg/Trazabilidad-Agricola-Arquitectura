import { useEffect, useRef, useState } from "react";
import { api } from "../api.js";
export function useLogistics(centers) {
  const [centerId, setCenterId] = useState(centers[0].id),
    [offset, setOffset] = useState(0),
    [data, setData] = useState(null),
    [selection, setSelection] = useState(null),
    [history, setHistory] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [pending, setPending] = useState(null);
  const inFlight = useRef(false),
    confirmation = useRef(null);
  const actions = centers.find((c) => c.id === centerId)?.actions ?? [],
    disabled = busy || !!pending;
  async function read(center, offset) {
    const grants = centers.find((c) => c.id === center)?.actions ?? [],
      query = `?centerId=${center}&offset=${offset}`;
    const [lots, entries, shipments] = await Promise.all([
      grants.includes("inventory:read")
        ? api("/inventory/lots" + query)
        : { items: [] },
      grants.includes("inventory:read")
        ? api("/inventory" + query)
        : { items: [] },
      grants.includes("shipment:read")
        ? api("/shipments" + query)
        : { items: [] },
    ]);
    return {
      lots: lots.items,
      entries: entries.items,
      shipments: shipments.items,
    };
  }
  useEffect(() => {
    let active = true;
    setBusy(true);
    setError("");
    read(centerId, offset)
      .then((value) => {
        if (active) setData(value);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [centerId, offset]);
  async function load(kind, id) {
    if (inFlight.current || pending) return;
    setBusy(true);
    setError("");
    setNotice("");
    setHistory(null);
    try {
      setSelection({
        kind,
        item: await api(
          (kind === "entry" ? "/inventory/entries/" : "/shipments/") + id,
        ),
      });
    } catch (e) {
      setSelection(null);
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function execute(intent) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    let committed = false;
    try {
      const item = await api(intent.path, {
        body: intent.body,
        method: intent.method,
        key: intent.key,
      });
      committed = true;
      setSelection({ kind: intent.kind, item });
      setHistory(null);
      setPending(null);
      setNotice("Operación confirmada.");
      setData(await read(centerId, offset));
      setTimeout(() => confirmation.current?.focus(), 0);
      return true;
    } catch (e) {
      setError(
        committed
          ? "La operación se confirmó, pero no se pudo actualizar la lista. Consulta los datos nuevamente."
          : e.message,
      );
      if (!committed) setPending(!e.status || e.status >= 500 ? intent : null);
      return false;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  const command = (path, body, kind, method = "POST") => {
    if (pending || inFlight.current) return false;
    return execute({ path, body, kind, method, key: crypto.randomUUID() });
  };
  async function refresh() {
    if (pending) return;
    setBusy(true);
    setError("");
    try {
      setData(await read(centerId, offset));
      if (selection)
        setSelection({
          ...selection,
          item: await api(
            (selection.kind === "entry"
              ? "/inventory/entries/"
              : "/shipments/") + selection.item.id,
          ),
        });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function showHistory(kind, id, page = 0) {
    setBusy(true);
    setError("");
    try {
      setHistory({
        kind,
        id,
        offset: page,
        data: await api(
          (kind === "entry"
            ? `/inventory/entries/${id}/movements`
            : `/shipments/${id}/events`) +
            "?offset=" +
            page,
        ),
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function changeCenter(value) {
    setCenterId(value);
    setOffset(0);
    setSelection(null);
    setHistory(null);
    setData(null);
    setNotice("");
  }
  function changePage(value) {
    setOffset(value);
    setSelection(null);
    setHistory(null);
  }

  return {
    centerId,
    offset,
    data,
    selection,
    history,
    busy,
    error,
    notice,
    pending,
    confirmation,
    actions,
    disabled,
    load,
    execute,
    command,
    refresh,
    showHistory,
    changeCenter,
    changePage,
  };
}
