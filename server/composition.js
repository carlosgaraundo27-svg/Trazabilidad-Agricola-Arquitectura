import { accessRepository } from "./modules/access/repository.js";
import { accessService } from "./modules/access/application.js";
import * as passwords from "./modules/access/password.js";
import { producersRepository } from "./modules/producers/repository.js";
import { producersService } from "./modules/producers/application.js";
import { harvestRepository } from "./modules/harvest/repository.js";
import { harvestService } from "./modules/harvest/application.js";
export function compose(db) {
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
  return { access, producers, harvest };
}
