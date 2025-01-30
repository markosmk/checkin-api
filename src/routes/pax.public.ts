import { Hono } from "hono"
import { HTTPException } from "hono/http-exception"
import { zValidator } from "@hono/zod-validator"

import prismaClients from "../lib/prisma"
import { Variables } from "../types/jwt"
import { createPaxSchema } from "./pax"
import { verifyToken } from "../utils/security"

const publicPax = new Hono<{ Bindings: Env; Variables: Variables }>()

// create empty pax
publicPax.post("/:bookingId", async (c) => {
  const bookingId = c.req.param("bookingId")
  if (!bookingId) throw new HTTPException(400, { message: "Booking es necesario." })

  const token = c.req.header("X-Reservation-Token")
  if (!token) throw new HTTPException(403, { message: "Acceso denegado." })

  const decoded = await verifyToken(token, c.env.SECRET_KEY_RESERVATION)
  if (!decoded) throw new HTTPException(403, { message: "Token inválido o expirado." })

  const prisma = await prismaClients.fetch(c.env.DATABASE_URL)
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, reservationId: decoded.reservationId, hotelId: decoded.hotelId },
  })
  if (!booking) throw new HTTPException(404, { message: "Pax no encontrado." })

  const newPax = await prisma.pax.create({
    data: {
      bookingId: booking.id,
      firstname: "",
      lastname: "",
      email: "",
      phone: "",
      birthdate: "",
      docType: "",
      docNumber: "",
    },
  })
  return c.json(newPax)
})

const updatePaxSchema = createPaxSchema.partial()
publicPax.put("/:id", zValidator("json", updatePaxSchema), async (c) => {
  const data = c.req.valid("json")

  const paxId = c.req.param("id")
  if (!paxId) throw new HTTPException(400, { message: "Pax es necesario." })

  const token = c.req.header("X-Reservation-Token")
  if (!token) throw new HTTPException(403, { message: "Acceso denegado." })

  const decoded = await verifyToken(token, c.env.SECRET_KEY_RESERVATION)
  if (!decoded) throw new HTTPException(403, { message: "Token inválido o expirado." })

  const prisma = await prismaClients.fetch(c.env.DATABASE_URL)
  const pax = await prisma.pax.findFirst({
    where: { id: paxId, booking: { reservationId: decoded.reservationId, hotelId: decoded.hotelId } },
  })
  if (!pax) throw new HTTPException(404, { message: "Pax no encontrado." })

  const updatedPax = await prisma.pax.update({
    where: { id: paxId },
    data: {
      ...data,
      bookingId: pax.bookingId,
    },
  })
  return c.json(updatedPax)
})

publicPax.delete("/:id", async (c) => {
  const paxId = c.req.param("id")
  if (!paxId) throw new HTTPException(400, { message: "El paxId es necesario." })

  const token = c.req.header("X-Reservation-Token")
  if (!token) throw new HTTPException(403, { message: "Acceso denegado." })

  const decoded = await verifyToken(token, c.env.SECRET_KEY_RESERVATION)
  if (!decoded) throw new HTTPException(403, { message: "Token inválido o expirado." })

  const prisma = await prismaClients.fetch(c.env.DATABASE_URL)
  const pax = await prisma.pax.findFirst({
    where: { id: paxId, booking: { reservationId: decoded.reservationId, hotelId: decoded.hotelId } },
  })
  if (!pax) throw new HTTPException(404, { message: "Pax no encontrado." })

  await prisma.pax.delete({ where: { id: paxId } })
  return c.json({ message: "Pax eliminado correctamente." })
})

export default publicPax
