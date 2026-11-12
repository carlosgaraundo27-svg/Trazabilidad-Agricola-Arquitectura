let csrfToken;
export function setSession(session) {
  csrfToken = session?.csrfToken;
}
export async function api(path, { method = "GET", body, key } = {}) {
  const response = await fetch("/api/v1" + path, {
    method,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
      ...(key ? { "Idempotency-Key": key } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (response.status === 204) return null;
  const payload = await response.json();
  if (!response.ok) {
    const error = new Error(
      payload.error?.message || "No se pudo completar la solicitud.",
    );
    error.status = response.status;
    error.code = payload.error?.code;
    throw error;
  }
  return payload;
}
export async function listAll(path) {
  let result = [],
    offset = 0;
  for (;;) {
    const page = await api(path + "?offset=" + offset);
    result.push(...page.items);
    if (page.items.length < page.limit) return result;
    offset += page.limit;
  }
}
