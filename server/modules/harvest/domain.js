import { z } from "zod";
export const preLotInput = z
  .object({
    parcelId: z.uuid(),
    harvestedAt: z.iso
      .datetime({ offset: true })
      .refine(
        (v) => Date.parse(v) <= Date.now(),
        "La fecha no puede ser futura.",
      )
      .transform((v) => new Date(v).toISOString()),
    quantity: z
      .string()
      .regex(/^(?:0|[1-9][0-9]{0,8})(?:\.[0-9]{1,3})?$/)
      .refine((v) => Number(v) > 0)
      .transform((v) => Number(v).toFixed(3)),
    unit: z.enum(["kg", "unidad"]),
  })
  .strict();
export const requestKey = z.uuid();
