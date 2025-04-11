import { createInsertSchema, createUpdateSchema } from "drizzle-zod"
import { z } from "zod"
import { paxs } from "../../db/schema"

export const createPaxSchema = z.object({
  bookingId: z.string(),
  firstname: z.string().min(1, "El Nombre es necesario."),
  lastname: z.string().min(1, "El Apellido es necesario."),
  email: z.string().min(1, "El Email es necesario."),
  phone: z.string(),
  docType: z.enum(["DNI", "PASSPORT"]),
  docNumber: z.string(),
  nationalityCode: z.string().nullish(),
  files: z
    .object({
      docFrontPath: z.string().nullish(),
      docBackPath: z.string().nullish(),
      passportPath: z.string().nullish(),
      pdfPath: z.string().nullish(),
    })
    .optional(),
  guestObservations: z.string().nullish(),
  additionalProps: z
    .object({
      carModel: z.string().nullish(),
      carPlate: z.string().nullish(),
      arrivalDate: z.coerce.date().nullish(),
      departureDate: z.coerce.date().nullish(),
      country: z.string().nullish(),
      city: z.string().nullish(),
      address: z.string().nullish(),
      zipCode: z.string().nullish(),
      birthdate: z.string().nullish(),
    })
    .optional(),
  //   booking: z
  //     .object({
  //       requiredFields: z.array(z.string()).default([]),
  //       allowedFields: z.array(z.string()).default([]),
  //     })
  //     .optional(),
  submittedAt: z.coerce.date().nullish(),
  lastEditPaxAt: z.coerce.date().nullish(),
})
export type CreatePaxSchema = z.infer<typeof createPaxSchema>
export const paxInserSchema = createInsertSchema(paxs)

export const updatePaxSchema = createPaxSchema.partial()
export type UpdatePaxSchema = z.infer<typeof updatePaxSchema>
export const paxUpdateSchema = createUpdateSchema(paxs)
