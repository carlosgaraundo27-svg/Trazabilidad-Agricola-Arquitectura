import { missing } from "../../shared/errors.js";
export function producersService({ repository, unitOfWork, access }) {
  return {
    async createProducer(actor, input) {
      access.authorize(actor, "producer:create");
      return unitOfWork(async (tx) => {
        const result = await repository.createProducer(tx, actor, input);
        await access.audit(tx, actor, "producer:create", result.id);
        return result;
      });
    },
    async createParcel(actor, input) {
      access.authorize(actor, "parcel:create");
      return unitOfWork(async (tx) => {
        if (!(await repository.findProducer(tx, actor, input.producerId)))
          throw missing();
        const result = await repository.createParcel(tx, actor, input);
        await access.audit(tx, actor, "parcel:create", result.id);
        return result;
      });
    },
    async listProducers(actor, offset = 0) {
      access.authorize(actor, "producer:read");
      return unitOfWork(async (tx) =>
        repository.listProducers(
          tx,
          actor,
          await access.scope(tx, actor),
          offset,
        ),
      );
    },
    async listParcels(actor, offset = 0) {
      access.authorize(actor, "parcel:read");
      return unitOfWork(async (tx) =>
        repository.listParcels(
          tx,
          actor,
          await access.scope(tx, actor),
          offset,
        ),
      );
    },
    // Contrato público de origen; el llamador propaga la misma unidad de trabajo.
    async requireHarvestOrigin(tx, actor, parcelId) {
      const ids = await access.scope(tx, actor, true);
      if (!ids.includes(parcelId)) throw missing();
      const parcel = await repository.findParcel(tx, actor, parcelId);
      if (!parcel) throw missing();
      return parcel;
    },
  };
}
