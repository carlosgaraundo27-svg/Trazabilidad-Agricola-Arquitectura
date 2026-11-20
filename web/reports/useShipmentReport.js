import { useEffect, useRef, useState } from "react";
import { api } from "../api.js";

function initialFilters(centerId) {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  return {
    centerId,
    from: start.toISOString().slice(0, -1),
    to: new Date(start.getTime() + 86400000).toISOString().slice(0, -1),
    state: "",
    lotId: "",
  };
}
export function useShipmentReport(centers) {
  const generation = useRef(0);
  const [filters, setFilters] = useState(() => initialFilters(centers[0].id));
  const [query, setQuery] = useState(null);
  const [result, setResult] = useState({
    loading: false,
    data: null,
    error: "",
  });
  useEffect(() => {
    if (!query) return;
    let active = true;
    const version = ++generation.current;
    setResult({ loading: true, data: null, error: "" });
    const cursor = query.cursors.at(-1);
    const params = new URLSearchParams(query.filters);
    if (cursor) {
      params.set("afterDepartedAt", cursor.departedAt);
      params.set("afterShipmentId", cursor.shipmentId);
    }
    api("/reports/shipments?" + params)
      .then((data) => {
        if (active && version === generation.current)
          setResult({ loading: false, data, error: "" });
      })
      .catch((error) => {
        if (active && version === generation.current)
          setResult({ loading: false, data: null, error: error.message });
      });
    return () => {
      active = false;
    };
  }, [query]);
  function change(name, value) {
    generation.current++;
    setFilters((old) => ({ ...old, [name]: value }));
    setQuery(null);
    setResult({ loading: false, data: null, error: "" });
  }
  function apply(event) {
    event.preventDefault();
    generation.current++;
    const applied = {
      centerId: filters.centerId,
      from: new Date(filters.from + "Z").toISOString(),
      to: new Date(filters.to + "Z").toISOString(),
    };
    if (filters.state) applied.state = filters.state;
    if (filters.lotId.trim()) applied.lotId = filters.lotId.trim();
    setQuery({ filters: applied, cursors: [null] });
  }
  function page(next) {
    generation.current++;
    if (next && result.data?.nextCursor)
      setQuery((old) => ({
        ...old,
        cursors: [...old.cursors, result.data.nextCursor],
      }));
    else if (!next)
      setQuery((old) => ({ ...old, cursors: old.cursors.slice(0, -1) }));
  }
  return {
    filters,
    query,
    ...result,
    change,
    apply,
    page,
    retry: () => setQuery((old) => ({ ...old })),
  };
}
