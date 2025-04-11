import z from "zod"
import { isCuid } from "@paralleldrive/cuid2"

export const cuidSchema = z
  .string()
  .min(24, "The CUID must be at least 24 characters long.")
  .max(24, "The CUID must be exactly 24 characters long.")
  .refine((val) => isCuid(val), {
    message: "Invalid CUID format",
  })

export const createCuidSchema = (params: string | string[]) =>
  z.object(Object.fromEntries((Array.isArray(params) ? params : [params]).map((param) => [param, cuidSchema])))
