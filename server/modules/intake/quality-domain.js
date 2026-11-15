import { z } from "zod";
export const qualityUuid = z.uuid().transform((v) => v.toLowerCase());
const text = z.string().trim().min(1).max(500);
const instant = z.iso
  .datetime({ offset: true, precision: undefined })
  .refine(
    (v) => !/\.\d{4}/.test(v) && Date.parse(v) <= Date.now(),
    "Instante con hasta milisegundos, no futuro.",
  )
  .transform((v) => new Date(v).toISOString());
const decimal = z
  .string()
  .regex(/^-?(?:0|[1-9][0-9]{0,5})(?:\.[0-9]{1,2})?$/)
  .refine((v) => !v.includes("\n") && !v.includes("\r"))
  .transform((v) => {
    const [w, d = ""] = v.split(".");
    return (Number(v) === 0 ? "0" : w) + "." + d.padEnd(2, "0");
  });
const metadata = {
  measuredAt: instant,
  observedBy: text,
  provenance: text,
  method: text,
};
const weight = z
  .object({
    ...metadata,
    fruitReference: z.string().trim().min(1).max(120),
    value: decimal.refine((v) => Number(v) > 0),
    unit: z.literal("g/fruto"),
  })
  .strict();
const dryMatter = z
  .object({
    ...metadata,
    value: decimal.refine((v) => Number(v) >= 0 && Number(v) <= 100),
    unit: z.literal("%"),
  })
  .strict();
const discard = z
  .object({
    ...metadata,
    inspectedCount: z.number().int().min(1).max(1000000),
    discardedCount: z.number().int().min(0).max(1000000),
    unit: z.literal("frutos"),
  })
  .strict()
  .refine(
    (v) => v.discardedCount <= v.inspectedCount,
    "Descartados no puede superar examinados.",
  );
const temperature = z
  .object({
    ...metadata,
    value: decimal,
    unit: z.literal("°C"),
    stage: z.enum(["receipt", "post_consolidation"]),
    sourceReceiptId: qualityUuid.nullable(),
  })
  .strict()
  .refine(
    (v) => (v.stage === "receipt") === (v.sourceReceiptId !== null),
    "La recepción es obligatoria solo en temperatura de recepción.",
  );
export const captureShape = {
  sample: z
    .object({
      reference: z.string().trim().min(1).max(120),
      sampledAt: instant,
      sampledBy: text,
      provenance: text,
    })
    .strict()
    .nullable(),
  weights: z.array(weight).max(100),
  dryMatter: dryMatter.nullable(),
  discard: discard.nullable(),
  temperatures: z.array(temperature).max(100),
};
const uniqueReferences = (v) =>
  new Set(v.weights.map((w) => w.fruitReference)).size === v.weights.length &&
  new Set(
    v.temperatures
      .filter((t) => t.stage === "receipt")
      .map((t) => t.sourceReceiptId),
  ).size === v.temperatures.filter((t) => t.stage === "receipt").length;
export const captureInput = z
  .object(captureShape)
  .strict()
  .refine(uniqueReferences, "Referencias de fruto/recepción duplicadas.");
export const updateQualityInput = z
  .object({
    expectedVersion: z.number().int().min(1).max(2147483646),
    ...captureShape,
  })
  .strict()
  .refine(uniqueReferences, "Referencias duplicadas.");
export const createQualityInput = z.object({ lotId: qualityUuid }).strict();
export const closeQualityInput = z
  .object({
    expectedVersion: z.number().int().min(1).max(2147483646),
    result: z.enum(["accepted", "observed", "rejected"]),
    note: text,
  })
  .strict();
export const qualityPageInput = z
  .object({
    centerId: qualityUuid,
    offset: z.coerce.number().int().min(0).max(1000000).default(0),
  })
  .strict();
export const emptyCapture = () => ({
  sample: null,
  weights: [],
  dryMatter: null,
  discard: null,
  temperatures: [],
});
export function discardPercentage(discard) {
  if (!discard) return null;
  const n = BigInt(discard.discardedCount) * 10000n,
    d = BigInt(discard.inspectedCount);
  const rounded = (n * 2n + d) / (d * 2n);
  return String(rounded / 100n) + "." + String(rounded % 100n).padStart(2, "0");
}
