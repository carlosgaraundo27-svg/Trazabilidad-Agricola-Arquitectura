import { z } from "zod";
const uuidInput = z.uuid().transform((value) => value.toLowerCase());
export const lotInput = z
  .object({
    centerId: uuidInput,
    receiptIds: z
      .array(uuidInput)
      .min(1)
      .max(100)
      .refine(
        (ids) => new Set(ids).size === ids.length,
        "Recepciones repetidas.",
      )
      .transform((ids) =>
        [...ids].sort((left, right) => left.localeCompare(right, "en")),
      ),
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
