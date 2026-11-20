import { z } from "zod";

const uuid = z.uuid().transform((v) => v.toLowerCase());
const instant = z.iso
  .datetime({ offset: true })
  .max(35)
  .refine((v) => !/\.\d{4}/.test(v), "Use hasta tres decimales de segundo.")
  .refine((v) => {
    const year = new Date(v).getUTCFullYear();
    return year >= 1 && year <= 9999;
  }, "Use un año UTC entre 0001 y 9999.")
  .transform((v) => new Date(v).toISOString());
export const shipmentReportInput = z
  .object({
    centerId: uuid,
    from: instant,
    to: instant,
    state: z.enum(["in_transit", "delivered"]).optional(),
    lotId: uuid.optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    afterDepartedAt: instant.optional(),
    afterShipmentId: uuid.optional(),
  })
  .strict()
  .refine(
    (v) =>
      Date.parse(v.to) > Date.parse(v.from) &&
      Date.parse(v.to) - Date.parse(v.from) <= 31 * 86400000,
    "Seleccione un intervalo de salida posterior y de hasta 31 días.",
  )
  .refine(
    (v) => Boolean(v.afterDepartedAt) === Boolean(v.afterShipmentId),
    "El cursor requiere fecha de salida e identificador.",
  )
  .refine(
    (v) =>
      !v.afterDepartedAt ||
      (Date.parse(v.afterDepartedAt) >= Date.parse(v.from) &&
        Date.parse(v.afterDepartedAt) < Date.parse(v.to)),
    "El cursor debe estar dentro del intervalo de salida.",
  );
