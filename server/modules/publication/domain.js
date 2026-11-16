import { z } from "zod";
import { createHash } from "node:crypto";
export const uuid = z.uuid().transform((v) => v.toLowerCase());
export const publicId = z
  .uuid({ version: "v4" })
  .transform((v) => v.toLowerCase());
export const publicDto = z
  .object({
    lotCode: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/),
    stages: z
      .array(
        z
          .object({
            stage: z.enum(["harvest", "reception", "consolidation"]),
            date: z.iso
              .date()
              .refine((v) => v <= new Date().toISOString().slice(0, 10)),
            description: z.string().trim().min(1).max(500),
          })
          .strict(),
      )
      .min(1)
      .max(20),
  })
  .strict();
const expectedVersion = z.number().int().min(0).max(2147483646);
export const publishInput = publicDto.extend({ expectedVersion }).strict();
export const withdrawInput = z.object({ expectedVersion }).strict();
export const pageInput = z
  .object({
    centerId: uuid,
    offset: z.coerce.number().int().min(0).max(1000000).default(0),
  })
  .strict();
export const contentHash = (dto) =>
  createHash("sha256")
    .update(JSON.stringify(publicDto.parse(dto)))
    .digest("hex");
export const cacheKey = (id, version) => `public:lot:v1:${id}:${version}`;
export function publicUrl(base, id, production = false) {
  if (!base) throw Error("Configure PUBLIC_BASE_URL para generar QR.");
  const url = new URL(base);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    (production && url.protocol !== "https:") ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  )
    throw Error("PUBLIC_BASE_URL no válida.");
  return url.origin + "/q/" + publicId.parse(id);
}
