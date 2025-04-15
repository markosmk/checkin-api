import { z } from "@hono/zod-openapi"
import { createInsertSchema, createUpdateSchema } from "drizzle-zod"
import { bookings } from "../../db/schema"
import { BookingStatus } from "../../db/enum"

export const createBookingSchema = createInsertSchema(bookings)
  .omit({
    id: true,
    userId: true,
    createdAt: true,
    updatedAt: true,
    maxPaxs: true,
  })
  .extend({
    client: z.object({
      firstname: z.string().min(1, "El nombre es obligatorio."),
      lastname: z.string().min(1, "El apellido es obligatorio."),
      email: z.string().email("Correo inválido."),
    }),
    maxPaxs: z.number().min(1, "El número de personas es obligatorio."),
  })

export type CreateBookingInput = z.infer<typeof createBookingSchema> & {
  client: {
    firstname: string
    lastname: string
    email: string
  }
}

export const reservationIdSchema = z
  .string()
  .min(1, "El número de reserva es obligatorio.")
  .max(60, "El número de reserva debe tener menos de 60 caracteres.")
  .regex(/^[a-zA-Z0-9_-]+$/, "El número de reserva solo puede contener letras, números, guiones bajos y guiones.")

// export const updateBookingSchema = createBookingSchema.partial()
export const updateBookingSchema = createUpdateSchema(bookings).extend({
  status: z.nativeEnum(BookingStatus),
})
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>
