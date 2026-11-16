import { z } from "zod";
const text = z.string().trim().min(1).max(500);
export const observationInstant = z.iso
  .datetime({ offset: true })
  .refine(
    (v) => !/\.\d{4}/.test(v) && Date.parse(v) <= Date.now(),
    "Instante con hasta milisegundos, no futuro.",
  )
  .transform((v) => new Date(v).toISOString());
export const exactDecimal = z
  .string()
  .regex(/^-?(?:0|[1-9][0-9]{0,5})(?:\.[0-9]{1,2})?$/)
  .refine((v) => !v.includes("\n") && !v.includes("\r"))
  .transform((v) => {
    const [w, d = ""] = v.split(".");
    return (Number(v) === 0 ? "0" : w) + "." + d.padEnd(2, "0");
  });
export const observationMetadata = {
  measuredAt: observationInstant,
  observedBy: text,
  provenance: text,
  method: text,
};
export const originalTemperatureInput = z
  .object({
    ...observationMetadata,
    value: exactDecimal,
    unit: z.literal("°C"),
  })
  .strict();
