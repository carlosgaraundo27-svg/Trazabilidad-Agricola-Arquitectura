import { expect, test } from "@jest/globals";
import {
  validateStock,
  validateDeparture,
  validateDelivery,
} from "../../server/modules/logistics/policies.js";

const approved = { evaluationState: "closed", qualityResult: "accepted" };
const stock = {
  qualitySummary: approved,
  onHandKg: "73.125",
  unreservedKg: "73.125",
  reservedKg: "73.125",
};
const shipment = {
  quantityKg: "73.125",
  createdAt: "2026-01-02T10:00:00Z",
  departedAt: "2026-01-02T11:00:00Z",
  destinationLabel: "Destino ficticio",
  transport: {
    guideReference: "FICTICIO",
    vehicleLabel: "Unidad",
    plate: "FIC",
    driverName: "Ficticio",
    sealReference: "Sello",
  },
};
test.each(["reserved", "dispatched"])(
  "%s exige liberación explícita además de Calidad",
  (kind) => {
    expect(() =>
      validateStock({ disposition: "released" }, shipment, stock, kind),
    ).not.toThrow();
    expect(() =>
      validateStock({ disposition: "quarantine" }, shipment, stock, kind),
    ).toThrow(expect.objectContaining({ code: "INVENTORY_NOT_RELEASED" }));
  },
);
test.each([
  null,
  { evaluationState: "draft", qualityResult: "accepted" },
  { evaluationState: "closed", qualityResult: "rejected" },
])("no despacha con Calidad insuficiente: %j", (qualitySummary) => {
  expect(() =>
    validateStock(
      { disposition: "released" },
      shipment,
      { ...stock, qualitySummary },
      "reserved",
    ),
  ).toThrow(expect.objectContaining({ code: "QUALITY_NOT_APPROVED" }));
});
test.each([
  ["reserved", "unreservedKg"],
  ["dispatched", "reservedKg"],
  ["reserved", "onHandKg"],
])("%s rechaza falta de stock en %s sin redondear", (kind, field) => {
  expect(() =>
    validateStock(
      { disposition: "released" },
      shipment,
      { ...stock, [field]: "73.124" },
      kind,
    ),
  ).toThrow(expect.objectContaining({ code: "STOCK_INSUFFICIENT" }));
});
test.each(Object.keys(shipment.transport))(
  "salida exige %s y no modifica el transporte",
  (field) => {
    const incomplete = {
      ...shipment,
      transport: { ...shipment.transport, [field]: null },
    };
    expect(() =>
      validateDeparture(incomplete, { departedAt: shipment.departedAt }),
    ).toThrow(expect.objectContaining({ code: "TRANSPORT_INCOMPLETE" }));
    expect(incomplete.transport[field]).toBeNull();
  },
);
test("salida acepta instante de preparación y rechaza 1 ms anterior", () => {
  expect(() =>
    validateDeparture(shipment, { departedAt: shipment.createdAt }),
  ).not.toThrow();
  expect(() =>
    validateDeparture(shipment, { departedAt: "2026-01-02T09:59:59.999Z" }),
  ).toThrow(expect.objectContaining({ code: "DEPARTURE_TIME" }));
});
test.each([
  { receivedKg: "73.124", deliveredAt: shipment.departedAt },
  { receivedKg: "73.125", deliveredAt: "2026-01-02T10:59:59.999Z" },
])("entrega bloquea diferencia o instante anterior: %j", (input) => {
  expect(() => validateDelivery(shipment, input)).toThrow(
    expect.objectContaining({ code: "DELIVERY_TOTAL" }),
  );
});
test("entrega total en el mismo instante de salida está permitida", () => {
  expect(() =>
    validateDelivery(shipment, {
      receivedKg: "73.125",
      deliveredAt: shipment.departedAt,
    }),
  ).not.toThrow();
});
