import { createHash } from "node:crypto";
import { z } from "zod";

export const captureId = z.uuid().transform((v) => v.toLowerCase());
export const syncInput = z
  .object({
    schemaVersion: z.literal(1),
    parcelId: captureId,
    harvestedAt: z.iso
      .datetime({ offset: true })
      .refine(
        (v) => /T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(v),
        "Indique segundos y hasta milisegundos.",
      )
      .refine(
        (v) => Date.parse(v) <= Date.now(),
        "La fecha no puede ser futura.",
      )
      .transform((v) => new Date(v).toISOString()),
    quantity: z
      .string()
      .regex(/^(?:0|[1-9]\d{0,8})(?:\.\d{1,3})?$/)
      .refine((v) => /[1-9]/.test(v), "La cantidad debe ser positiva.")
      .transform((v) => {
        const [whole, fraction = ""] = v.split(".");
        return whole + "." + fraction.padEnd(3, "0");
      }),
    unit: z.enum(["kg", "unidad"]),
  })
  .strict();

export const payloadDigest = (input) =>
  createHash("sha256").update(JSON.stringify(input)).digest("hex");
