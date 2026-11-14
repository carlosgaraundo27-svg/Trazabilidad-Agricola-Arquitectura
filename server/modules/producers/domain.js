import { z } from "zod";
export const producerInput = z
  .object({ name: z.string().trim().min(1).max(120) })
  .strict();
export const parcelInput = z
  .object({
    producerId: z.uuid(),
    name: z.string().trim().min(1).max(120),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  })
  .strict();
