import { z } from "zod";
import { AppError } from "../../shared/errors.js";
export const uuid = z.uuid().transform((v) => v.toLowerCase());
export const milli = (value) => {
  const [whole, decimal = ""] = value.split(".");
  return BigInt(whole) * 1000n + BigInt(decimal.padEnd(3, "0"));
};
export const kilograms = (value) =>
  `${value / 1000n}.${String(value % 1000n).padStart(3, "0")}`;
export const kgInput = z
  .string()
  .regex(/^(?:0|[1-9][0-9]{0,11})(?:\.[0-9]{1,3})?$/)
  .refine((v) => /[1-9]/.test(v), "La cantidad debe ser positiva.")
  .transform((v) => kilograms(milli(v)));
const text = (max = 500) => z.string().trim().min(1).max(max);
const optionalText = (max = 120) => text(max).nullable().default(null);
export const transportInput = z
  .object({
    guideReference: optionalText().transform((v) => v?.toUpperCase() ?? null),
    vehicleLabel: optionalText(),
    plate: optionalText().transform((v) => v?.toUpperCase() ?? null),
    driverName: optionalText(),
    sealReference: optionalText(),
  })
  .strict();
export const pageInput = z
  .object({
    centerId: uuid,
    offset: z.coerce.number().int().min(0).max(100000).default(0),
  })
  .strict();
export const offsetInput = z
  .object({ offset: z.coerce.number().int().min(0).max(100000).default(0) })
  .strict();
export const admissionInput = z
  .object({
    lotId: uuid,
    verifiedKg: kgInput,
    reference: text(120),
    evidenceRef: text(),
  })
  .strict();
const version = z.number().int().positive().max(2147483647);
export const releaseInput = z
  .object({ expectedVersion: version, reason: text() })
  .strict();
export const shipmentInput = z
  .object({
    stockEntryId: uuid,
    transport: transportInput.prefault({}),
    destinationLabel: optionalText(),
  })
  .strict();
export const correctionInput = z
  .object({
    expectedVersion: version,
    transport: transportInput,
    destinationLabel: optionalText(),
    reason: text(),
  })
  .strict();
export const reservationInput = z
  .object({ expectedVersion: version, expectedInventoryVersion: version })
  .strict();
const instant = z.iso
  .datetime({ offset: true })
  .refine(
    (v) => !/\.\d{4}/.test(v),
    "Use hasta tres decimales de segundo; no se redondea el instante.",
  )
  .refine(
    (v) => Date.parse(v) <= Date.now(),
    "El instante no puede ser futuro.",
  );
export const departureInput = reservationInput
  .extend({ departedAt: instant })
  .strict();
export const deliveryInput = reservationInput
  .extend({ receivedKg: kgInput, deliveredAt: instant, evidenceRef: text() })
  .strict();
export const cancellationInput = reservationInput
  .extend({ reason: text() })
  .strict();
export const eligible = (quality) =>
  quality?.evaluationState === "closed" &&
  quality?.qualityResult === "accepted";
export function balances(totals) {
  const amount = (kind) => milli(totals[kind] ?? "0");
  const admitted = amount("admitted"),
    shipped = amount("dispatched"),
    delivered = amount("delivered");
  const onHand = admitted - shipped,
    reserved = amount("reserved") - amount("reservation_released") - shipped;
  const transit = shipped - delivered,
    available = onHand - reserved;
  if (
    admitted <= 0n ||
    onHand < 0n ||
    reserved < 0n ||
    available < 0n ||
    transit < 0n ||
    delivered < 0n ||
    admitted !== onHand + transit + delivered
  )
    throw new AppError(
      500,
      "INVENTORY_INVARIANT",
      "Inventario inconsistente. Operación no aplicada.",
    );
  return {
    admittedKg: kilograms(admitted),
    onHandKg: kilograms(onHand),
    reservedKg: kilograms(reserved),
    unreservedKg: kilograms(available),
    inTransitKg: kilograms(transit),
    deliveredKg: kilograms(delivered),
  };
}
