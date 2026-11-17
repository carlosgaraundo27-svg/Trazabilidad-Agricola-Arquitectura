import { AppError } from "../../shared/errors.js";
import { eligible } from "./domain.js";
export function requireEligible(summary) {
  if (!eligible(summary))
    throw new AppError(
      422,
      "QUALITY_NOT_APPROVED",
      "Se requiere evaluación de Calidad cerrada con resultado Aprobado.",
    );
}
export const stockInsufficient = () =>
  new AppError(
    409,
    "STOCK_INSUFFICIENT",
    "No hay disponibilidad suficiente para reservar o despachar el lote completo. Revise la reserva vigente.",
  );
export function validateStock(entry, shipment, stock, kind) {
  requireEligible(stock.qualitySummary);
  if (entry.disposition !== "released")
    throw new AppError(
      422,
      "INVENTORY_NOT_RELEASED",
      "Libere explícitamente el inventario antes de reservar o salir.",
    );
  const available = kind === "reserved" ? stock.unreservedKg : stock.reservedKg;
  if (
    available !== shipment.quantityKg ||
    stock.onHandKg !== shipment.quantityKg
  )
    throw stockInsufficient();
}
export function validateDeparture(shipment, input) {
  if (
    !shipment.destinationLabel ||
    Object.values(shipment.transport).some((v) => !v)
  )
    throw new AppError(
      422,
      "TRANSPORT_INCOMPLETE",
      "Complete guía, vehículo, placa, chofer, precinto y destino antes de confirmar salida.",
    );
  if (Date.parse(input.departedAt) < new Date(shipment.createdAt).getTime())
    throw new AppError(
      422,
      "DEPARTURE_TIME",
      "La salida no puede ser anterior a la preparación del despacho.",
    );
}
export function validateDelivery(shipment, input) {
  if (
    input.receivedKg !== shipment.quantityKg ||
    Date.parse(input.deliveredAt) < new Date(shipment.departedAt).getTime()
  )
    throw new AppError(
      422,
      "DELIVERY_TOTAL",
      "Confirme el total real después de la salida. Una diferencia requiere conciliación fuera de este alcance; no se crea merma.",
    );
}
