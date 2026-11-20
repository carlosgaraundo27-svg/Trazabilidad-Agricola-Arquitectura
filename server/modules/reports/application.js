import { AppError } from "../../shared/errors.js";

export function reportsService({ repository, unitOfWork, access }) {
  return {
    async shipments(actor, input) {
      try {
        return await unitOfWork(async (tx) => {
          await tx.query("SET LOCAL statement_timeout = '5s'");
          await access.requireActiveSession(tx, actor);
          await access.requireCenter(
            tx,
            actor,
            input.centerId,
            "shipment:read",
          );
          const rows = await repository.shipments(tx, actor, input);
          const items = rows.slice(0, input.limit).map((row) => ({
            ...row,
            departedAt: row.departedAt.toISOString(),
            deliveredAt: row.deliveredAt?.toISOString() ?? null,
          }));
          const last = items.at(-1);
          return {
            items,
            limit: input.limit,
            nextCursor:
              rows.length > input.limit
                ? { departedAt: last.departedAt, shipmentId: last.shipmentId }
                : null,
            generatedAt: new Date().toISOString(),
            timeZone: "UTC",
            dateField: "departedAt",
          };
        });
      } catch (error) {
        if (error.code === "57014")
          throw new AppError(
            503,
            "REPORT_TIMEOUT",
            "La consulta agotó su tiempo. Reduzca el intervalo e intente otra vez.",
          );
        throw error;
      }
    },
  };
}
