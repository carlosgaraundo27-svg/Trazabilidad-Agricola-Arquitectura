import { z } from "zod";
export const lotInput = z
  .object({
    centerId: z.uuid(),
    receiptIds: z
      .array(z.uuid())
      .min(1)
      .max(100)
      .refine(
        (ids) => new Set(ids).size === ids.length,
        "Recepciones repetidas.",
      )
      .transform((ids) => [...ids].sort()),
  })
  .strict();
export function compatibleOrigins(origins) {
  return (
    origins.length > 0 &&
    origins.every((origin) =>
      [
        "organizationId",
        "centerId",
        "producerId",
        "parcelId",
        "localHarvestDate",
      ].every((field) => origin[field] === origins[0][field]),
    )
  );
}
