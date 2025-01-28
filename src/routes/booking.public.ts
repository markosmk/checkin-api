import { Hono } from "hono"
import prismaClients from "../lib/prisma"

const publicBooking = new Hono<{ Bindings: Env }>()

publicBooking.get("/:id", async (c) => {
  const prisma = await prismaClients.fetch(c.env.DB)
  const bookingId = c.req.param("id")

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { paxs: true },
  })

  if (!booking) return c.json({ error: "Booking no encontrado." }, 404)

  return c.json(booking)
})

publicBooking.get("/reservation/:reservationId", async (c) => {
  const prisma = await prismaClients.fetch(c.env.DB)
  const reservationId = c.req.param("reservationId")

  const booking = await prisma.booking.findFirst({
    where: { reservationId },
    include: { hotel: true, paxs: true },
  })

  if (!booking) return c.json({ error: "Booking no encontrado." }, 404)

  return c.json(booking)
})

export default publicBooking
