import { createClient } from "redis";
export const noCache = {
  get: async () => null,
  set: async () => {},
  delete: async () => {},
  close: async () => {},
};
export function redisCache(url, log = console.log) {
  if (!url) return noCache;
  const client = createClient({
    url,
    disableOfflineQueue: true,
    commandsQueueMaxLength: 100,
    commandOptions: { timeout: 150 },
    socket: {
      connectTimeout: 150,
      reconnectStrategy: (retries) =>
        Math.min(100 * 2 ** Math.min(retries, 5), 3000),
    },
  });
  let degraded = false;
  client.on("error", () => {
    if (!degraded)
      log(JSON.stringify({ event: "public_cache_connection_degraded" }));
    degraded = true;
  });
  client.on("ready", () => {
    if (degraded) log(JSON.stringify({ event: "public_cache_recovered" }));
    degraded = false;
  });
  client.connect().catch(() => {});
  const ready = () => {
    if (!client.isReady) throw Error("Cache unavailable");
    return client;
  };
  return {
    get: (key) => ready().get(key),
    set: (key, value, ttlSeconds) =>
      ready().set(key, value, { EX: ttlSeconds }),
    delete: (key) => ready().del(key),
    close: async () => {
      if (client.isOpen) client.destroy();
    },
  };
}
