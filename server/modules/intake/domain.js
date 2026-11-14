import { z } from "zod";

// Milésimas de kg: supuesto técnico del prototipo, sin redondeo implícito.
export const milliKg = (value) => {
  const [whole, decimal = ""] = value.split(".");
  const negative = whole.startsWith("-");
  const result =
    BigInt(whole.replace("-", "")) * 1000n + BigInt(decimal.padEnd(3, "0"));
  return negative ? -result : result;
};
export const kg = (value) => {
  const sign = value < 0n ? "-" : "";
  const absolute = value < 0n ? -value : value;
  return (
    sign + absolute / 1000n + "." + String(absolute % 1000n).padStart(3, "0")
  );
};
const massPattern = /^(?:0|[1-9][0-9]{0,8})(?:\.[0-9]{1,3})?$/;
const mass = z
  .string()
  .regex(massPattern)
  .transform((value) => kg(milliKg(value)));
export const receiptInput = z
  .object({
    centerId: z.uuid(),
    preLotId: z.uuid(),
    reference: z.string().trim().min(1).max(120),
    grossKg: mass,
    tareKg: mass,
    evidence: z.string().trim().min(1).max(500),
  })
  .strict()
  .refine(
    (value) =>
      !massPattern.test(value.grossKg) ||
      !massPattern.test(value.tareKg) ||
      milliKg(value.grossKg) > milliKg(value.tareKg),
    "Bruto debe superar tara.",
  );
export const reviewInput = z
  .object({ note: z.string().trim().min(1).max(500) })
  .strict();
export const confirmationInput = z.object({}).strict();
export const centerPageInput = z
  .object({
    centerId: z.uuid(),
    offset: z.coerce.number().int().min(0).max(1000000).default(0),
  })
  .strict();
export const localHarvestDate = (instant) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(instant));
export function measurement(input, origin) {
  const net = milliKg(input.grossKg) - milliKg(input.tareKg);
  const difference =
    origin.unit === "kg" ? net - milliKg(origin.quantity) : null;
  return {
    netKg: kg(net),
    differenceKg: difference === null ? null : kg(difference),
    reviewReason:
      difference === null
        ? "different_unit"
        : difference === 0n
          ? null
          : "quantity_difference",
  };
}
