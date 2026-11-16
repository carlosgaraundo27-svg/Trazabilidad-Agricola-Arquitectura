import { createHash, randomUUID } from "node:crypto";
import { AppError, missing } from "../../shared/errors.js";
import { publicDto, contentHash, cacheKey, publicUrl } from "./domain.js";
export function publicationService({
  repository,
  unitOfWork,
  cache,
  access,
  traceability,
  baseUrl,
  production = false,
  log = () => {},
}) {
  const conflict = () =>
    new AppError(
      409,
      "PUBLICATION_CONFLICT",
      "Publicación o versión desactualizada. Consulte el estado actual.",
    );
  async function cached(operation, work) {
    try {
      return await work();
    } catch {
      log(JSON.stringify({ event: "public_cache_degraded", operation }));
      return null;
    }
  }
  async function resource(tx, actor, lotId, action, lock = false) {
    const lot = await traceability.identity(tx, actor, lotId, lock);
    if (!lot) throw missing();
    try {
      await access.requireCenter(tx, actor, lot.centerId, action);
    } catch (e) {
      if (e.status === 403) throw missing();
      throw e;
    }
    return lot;
  }
  async function response(tx, actor, lot) {
    const row = await repository.get(tx, lot.id);
    if (!row)
      return {
        lotId: lot.id,
        state: "unpublished",
        version: 0,
        publicId: null,
        url: null,
        content: null,
        history: [],
      };
    return {
      lotId: lot.id,
      state: row.state,
      version: row.version,
      publicId: row.publicId,
      url: publicUrl(baseUrl, row.publicId, production),
      content: row.content,
      history: await repository.history(tx, actor, lot.id),
    };
  }
  async function command(actor, lotId, input, key, action) {
    const result = await unitOfWork(async (tx) => {
      const lot = await resource(tx, actor, lotId, action, true);
      await repository.lockRequest(tx, actor, key);
      const hash = createHash("sha256")
        .update(JSON.stringify({ lotId, input, action }))
        .digest("hex");
      const previous = await repository.request(tx, actor, key);
      if (previous) {
        if (previous.request_hash !== hash)
          throw new AppError(
            409,
            "IDEMPOTENCY_CONFLICT",
            "Clave usada con otro contenido u operación.",
          );
        return { replayed: true, item: previous.response };
      }
      const old = await repository.get(tx, lotId);
      if ((old?.version ?? 0) !== input.expectedVersion) throw conflict();
      const withdraw = action === "publication:withdraw";
      if (withdraw && old?.state !== "published") throw conflict();
      const content = withdraw
        ? old.content
        : publicDto.parse({ lotCode: input.lotCode, stages: input.stages });
      const next = {
        publicId: old?.publicId ?? randomUUID(),
        version: (old?.version ?? 0) + 1,
        state: withdraw ? "withdrawn" : "published",
        content,
        contentHash: contentHash(content),
      };
      publicUrl(baseUrl, next.publicId, production);
      await repository.save(tx, actor, lot, next);
      await access.audit(tx, actor, action, lotId);
      const item = await response(tx, actor, lot);
      await repository.saveRequest(tx, actor, key, hash, item);
      return {
        replayed: false,
        item,
        oldKey: old ? cacheKey(old.publicId, old.version) : null,
      };
    });
    if (result.oldKey)
      await cached("delete", () => cache.delete(result.oldKey));
    return { replayed: result.replayed, item: result.item };
  }
  return {
    publish: (actor, lotId, input, key) =>
      command(actor, lotId, input, key, "publication:publish"),
    withdraw: (actor, lotId, input, key) =>
      command(actor, lotId, input, key, "publication:withdraw"),
    get: (actor, lotId) =>
      unitOfWork(async (tx) =>
        response(
          tx,
          actor,
          await resource(tx, actor, lotId, "publication:read", "share"),
        ),
      ),
    list: (actor, { centerId, offset }) =>
      unitOfWork(async (tx) => {
        await access.requireCenter(tx, actor, centerId, "publication:read");
        const lots = await traceability.identities(tx, actor, centerId, offset);
        return Promise.all(
          lots.map(async (lot) => {
            const row = await repository.get(tx, lot.id);
            return {
              id: lot.id,
              state: row?.state ?? "unpublished",
              lotCode: row?.content.lotCode ?? null,
            };
          }),
        );
      }),
    async query(id) {
      try {
        return await unitOfWork(async (tx) => {
          const gate = await repository.publicGate(tx, id);
          if (!gate || gate.state !== "published") throw missing();
          const key = cacheKey(id, gate.version);
          const raw = await cached("get", () => cache.get(key));
          if (typeof raw === "string") {
            try {
              const dto = publicDto.parse(JSON.parse(raw));
              if (contentHash(dto) === gate.contentHash) return dto;
            } catch {
              /* Treat corrupt or non-public cache entries as misses. */
            }
          }
          const dto = publicDto.parse(
            await repository.snapshot(tx, id, gate.version),
          );
          if (contentHash(dto) !== gate.contentHash)
            throw Error("Invalid publication snapshot");
          await cached("set", () => cache.set(key, JSON.stringify(dto), 300));
          return dto;
        });
      } catch (e) {
        if (e instanceof AppError) throw e;
        throw new AppError(
          503,
          "PUBLIC_UNAVAILABLE",
          "La consulta no está disponible. Intente más tarde.",
        );
      }
    },
  };
}
