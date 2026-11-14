import { randomBytes, createHash } from "node:crypto";
import { AppError } from "../../shared/errors.js";
import { allowed } from "./domain.js";
const digest = (token) => createHash("sha256").update(token).digest("hex");
export function accessService({ repository, unitOfWork, passwords }) {
  const denied = () =>
    new AppError(401, "UNAUTHENTICATED", "Credenciales o sesión no válidas.");
  let dummy;
  return {
    authorize(actor, operation) {
      if (!allowed(actor.role, operation))
        throw new AppError(403, "FORBIDDEN", "Operación no permitida.");
    },
    async login(email, password) {
      dummy ??= passwords.hashPassword(randomBytes(32).toString("hex"));
      return unitOfWork(async (tx) => {
        const user = await repository.findUser(tx, email);
        const valid = await passwords.verifyPassword(
          password,
          user?.password_hash ?? (await dummy),
        );
        if (!user || !valid || !user.active) throw denied();
        const token = randomBytes(32).toString("hex"),
          csrfToken = randomBytes(32).toString("hex");
        await repository.saveSession(
          tx,
          digest(token),
          user.id,
          csrfToken,
          new Date(Date.now() + 8 * 3600000),
        );
        await repository.audit(
          tx,
          { id: user.id, organizationId: user.organization_id },
          "auth:login",
          user.id,
        );
        return {
          token,
          csrfToken,
          user: {
            id: user.id,
            organizationId: user.organization_id,
            email: user.email,
            role: user.role,
          },
        };
      });
    },
    async authenticate(token) {
      if (!token || !/^[a-f0-9]{64}$/.test(token)) throw denied();
      return unitOfWork(async (tx) => {
        const actor = await repository.session(tx, digest(token));
        if (!actor) throw denied();
        return actor;
      });
    },
    async logout(token) {
      await unitOfWork((tx) => repository.logout(tx, digest(token)));
    },
    scope: (tx, actor, lock) => repository.assignments(tx, actor, lock),
    audit: (tx, actor, action, id) => repository.audit(tx, actor, action, id),
  };
}
