import { z } from "zod"

// const LocationHotel = z
//   .object({
//     country: z.string(),
//     province: z.string(),
//     place: z.string(),
//     address: z.string(),
//     zipCode: z.string(),
//     googlePlaceId: z.string().nullable(),
//     longitude: z.string().nullable(),
//     latitude: z.string().nullable(),
//   })
//   .nullable()

export const slugSchema = z
  .string()
  .min(1, { message: "Slug is required" })
  .min(6, { message: "Slug must be at least 6 characters" })
  .regex(/^[a-z0-9-]+$/, { message: "Slug must be lowercase and can only contain letters, numbers, and hyphens" })
  .max(100, { message: "Slug must be less than 100 characters" })

export const createHotelSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  slug: slugSchema,
  type: z.string(),
  subType: z.string().optional(),
  phone: z.string(),
  email: z.string().email(),
  coverImage: z.string(),
  website: z.string().optional().default(""),
  rooms: z.coerce.number().int().positive(),
  isPublic: z.boolean().default(false),
  // options: z.object({
  //   maxChildrenAge: z.number().int().nullable(),
  // }).nullable(),
  // location: LocationHotel
})
export type CreateHotel = z.infer<typeof createHotelSchema>

export const updateHotelSchema = createHotelSchema.partial()
export type UpdateHotel = z.infer<typeof updateHotelSchema>
