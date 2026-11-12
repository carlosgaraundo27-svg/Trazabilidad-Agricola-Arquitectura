const permissions = {
  admin: ["producer:create", "producer:read", "parcel:create", "parcel:read"],
  collector: ["producer:read", "parcel:read", "prelot:create", "prelot:read"],
};
export const allowed = (role, operation) =>
  permissions[role]?.includes(operation) ?? false;
