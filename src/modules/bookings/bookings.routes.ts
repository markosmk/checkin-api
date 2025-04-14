import * as bookingService from "./bookings.service"
import type { App } from "../../types"
import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { createBookingSchema, updateBookingSchema } from "./bookings.schema"
import { createCuidSchema } from "../../utils/create-cuid-schema"
import { applyPlanLimits } from "../../middlewares/plan-limits.middleware"

const booking = new Hono<App>()

// list all bookings for a user's hotels
booking.get("/", async (c) => {
  const userId = c.get("session")?.userId
  const bookings = await bookingService.getBookings(c.get("db"), userId)
  return c.json(bookings)
})

booking.get("/:id", zValidator("param", createCuidSchema("id")), async (c) => {
  const userId = c.get("session")?.userId
  const bookingId = c.req.valid("param").id
  const booking = await bookingService.getBookingById(c.get("db"), userId, bookingId)
  return c.json(booking)
})

booking.get("/allByHotel/:hotelId", zValidator("param", createCuidSchema("hotelId")), async (c) => {
  const userId = c.get("session")?.userId
  const hotelId = c.req.valid("param").hotelId
  const bookings = await bookingService.getBookings(c.get("db"), userId, hotelId)
  return c.json(bookings)
})

booking.post("/", applyPlanLimits, zValidator("json", createBookingSchema), async (c) => {
  const userId = c.get("session")?.userId
  const data = c.req.valid("json")
  const booking = await bookingService.createBooking(c.get("db"), userId, data)
  return c.json({ message: "Booking creado con éxito", booking }, 201)
})

booking.put(
  "/:id",
  zValidator("param", createCuidSchema("id")),
  zValidator("json", updateBookingSchema.partial()),
  async (c) => {
    const userId = c.get("session")?.userId
    const data = c.req.valid("json")
    const bookingId = c.req.valid("param").id
    const bookingUpdated = await bookingService.updateBooking(c.get("db"), userId, bookingId, data)
    return c.json({ message: "Booking actualizado con éxito", booking: bookingUpdated })
  }
)

booking.delete("/:id", zValidator("param", createCuidSchema("id")), async (c) => {
  const userId = c.get("session")?.userId
  const bookingId = c.req.valid("param").id
  await bookingService.deleteBooking(c.get("db"), userId, bookingId)
  return c.json({ message: "Booking eliminado con éxito" }, 200)
})

// TODO: PUT change status to CONFIRMED.. and send email to contact pax
// await sendEmail({
//   to: contact.email,
//   subject: 'Check‑in confirmado',
//   html: `Hola ${contact.firstname}, tu check‑in para la reserva ${updated.reservationId} ha sido confirmado para el ${updated.checkin}. ¡Te esperamos!`,
//   apiKey: c.env.SERVICE_EMAIL_API_KEY,
// })

export default booking
