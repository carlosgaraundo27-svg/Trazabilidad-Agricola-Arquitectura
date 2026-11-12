export class AppError extends Error {
  constructor(status, code, message) {
    super(message);
    Object.assign(this, { status, code });
  }
}
export const missing = () =>
  new AppError(404, "NOT_FOUND", "Recurso no disponible.");
