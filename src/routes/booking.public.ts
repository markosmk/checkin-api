import { Hono } from "hono"
import { HTTPException } from "hono/http-exception"

import prismaClients from "../lib/prisma"
import { createToken, verifyToken } from "../utils/security"

const publicBooking = new Hono<{ Bindings: Env }>()

publicBooking.get("/:id", async (c) => {
  const bookingId = c.req.param("id")
  if (!bookingId) throw new HTTPException(400, { message: "ID de reserva no proporcionado." })

  const prisma = await prismaClients.fetch(c.env.DB)
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { paxs: true },
  })
  if (!booking) throw new HTTPException(404, { message: "Booking no encontrado." })

  return c.json(booking)
})

publicBooking.get("/reservation/refresh-token", async (c) => {
  const oldToken = c.req.header("X-Reservation-Token")
  if (!oldToken) throw new HTTPException(401, { message: "Token no proporcionado." })

  try {
    const decoded = await verifyToken(oldToken, c.env.SECRET_KEY_RESERVATION)
    if (!decoded) throw new HTTPException(401, { message: "Token inválido." })

    const prisma = await prismaClients.fetch(c.env.DB)
    const booking = await prisma.booking.findFirst({
      where: { id: decoded.bookingId, reservationId: decoded.reservationId, hotelId: decoded.hotelId },
    })
    if (!booking) throw new HTTPException(404, { message: "Booking no encontrado." })

    const newToken = await createToken(
      { bookingId: booking.id, reservationId: booking.reservationId, hotelId: booking.hotelId },
      c.env.SECRET_KEY_RESERVATION
    )
    return c.json({ token: newToken })
  } catch (err) {
    throw new HTTPException(401, { message: "Token inválido." })
  }
})

publicBooking.get("/reservation/:reservationId", async (c) => {
  const reservationId = c.req.param("reservationId")
  if (!reservationId) throw new HTTPException(400, { message: "ID de reserva no proporcionado." })

  const prisma = await prismaClients.fetch(c.env.DB)
  const booking = await prisma.booking.findFirst({
    where: { reservationId },
    include: { hotel: true, paxs: true },
  })

  if (!booking) throw new HTTPException(404, { message: "Booking no encontrado." })

  const token = await createToken(
    { bookingId: booking.id, reservationId: booking.reservationId, hotelId: booking.hotel.id },
    c.env.SECRET_KEY_RESERVATION
  )

  return c.json({ booking, token })
})

export default publicBooking
