import { accessRepository } from "./modules/access/repository.js";
import { accessService } from "./modules/access/application.js";
import * as passwords from "./modules/access/password.js";
import { producersRepository } from "./modules/producers/repository.js";
import { producersService } from "./modules/producers/application.js";
import { harvestRepository } from "./modules/harvest/repository.js";
import { harvestService } from "./modules/harvest/application.js";
import { harvestSyncRepository } from "./modules/harvest/sync-repository.js";
import { harvestSyncService } from "./modules/harvest/sync-application.js";
import { intakeService } from "./modules/intake/application.js";
import { intakeRepository } from "./modules/intake/repository.js";
import { qualityService } from "./modules/intake/quality-application.js";
import { qualityRepository } from "./modules/intake/quality-repository.js";
import { traceabilityService } from "./modules/traceability/application.js";
import { traceabilityRepository } from "./modules/traceability/repository.js";
import { publicationService } from "./modules/publication/application.js";
import { publicationRepository } from "./modules/publication/repository.js";
import { noCache } from "./adapters/public-cache.js";
import { logisticsRepository } from "./modules/logistics/repository.js";
import { logisticsService } from "./modules/logistics/application.js";
export function compose(
  db,
  {
    cache = noCache,
    baseUrl = process.env.PUBLIC_BASE_URL,
    production = process.env.NODE_ENV === "production",
    log = () => {},
  } = {},
) {
  const unitOfWork = (fn) => db.transaction(fn);
  const access = accessService({
    repository: accessRepository(),
    unitOfWork,
    passwords,
  });
  const producers = producersService({
    repository: producersRepository(),
    unitOfWork,
    access,
  });
  const harvest = harvestService({
    repository: harvestRepository(),
    unitOfWork,
    access,
    producers,
  });
  const traceability = traceabilityService({
    repository: traceabilityRepository(),
  });
  const harvestSync = harvestSyncService({
    repository: harvestSyncRepository(),
    unitOfWork,
    access,
    producers,
    harvest,
  });
  const intake = intakeService({
    repository: intakeRepository(),
    unitOfWork,
    access,
    harvest,
    traceability,
  });
  const publication = publicationService({
    repository: publicationRepository(),
    unitOfWork,
    access,
    traceability,
    cache,
    baseUrl,
    production,
    log,
  });
  const quality = qualityService({
    repository: qualityRepository(),
    unitOfWork,
    access,
    traceability,
    intake,
  });
  const logistics = logisticsService({
    repository: logisticsRepository(),
    unitOfWork,
    access,
    traceability,
    quality,
  });
  return {
    access,
    producers,
    harvest,
    intake,
    quality,
    publication,
    logistics,
    harvestSync,
  };
}
