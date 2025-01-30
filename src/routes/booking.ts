import { Hono } from "hono"
import { HTTPException } from "hono/http-exception"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"

import prismaClients from "../lib/prisma"
import { jwtMiddleware } from "../middlewares/jwt"
import { Variables } from "../types/jwt"
import { Status } from "@prisma/client"

const booking = new Hono<{ Bindings: Env; Variables: Variables }>()

booking.use("/*", jwtMiddleware)

const createBookingSchema = z.object({
  hotelId: z.string().min(1, "El ID del hotel es obligatorio."),
  reservationId: z.string().min(1, "El número de reserva es obligatorio."),
  client: z.object({
    firstname: z.string().min(1, "El nombre es obligatorio."),
    lastname: z.string().min(1, "El apellido es obligatorio."),
    email: z.string().email("Correo inválido."),
  }),
  status: z.enum([Status.confirmed, Status.cancelled, Status.pending, Status.unknown]).default(Status.unknown),
  checkin: z.string().datetime(),
  checkout: z.string().datetime().optional(),
  observations: z.string().optional(),
  nights: z.number().optional(),
  requiredFields: z.array(z.string()).optional(),
  allowedFields: z.array(z.string()).optional(),
})

booking.post("/", zValidator("json", createBookingSchema), async (c) => {
  const userId = c.get("jwtPayload")?.userId
  if (!userId) throw new HTTPException(401, { message: "No estás autenticado." })

  const data = c.req.valid("json")

  const prisma = await prismaClients.fetch(c.env.DATABASE_URL)
  const hotel = await prisma.hotel.findFirst({
    where: { id: data.hotelId, userId },
  })
  if (!hotel) return c.json({ error: "Hotel no encontrado o no pertenece al usuario." }, 404)

  const booking = await prisma.booking.create({
    data: {
      ...data,
      requiredFields: JSON.stringify(data.requiredFields),
      allowedFields: JSON.stringify(data.allowedFields),
      userId,
      hotelId: data.hotelId,
    },
  })

  return c.json({ message: "Booking creado con éxito", booking }, 201)
})

const updateBookingSchema = createBookingSchema.partial()
booking.put("/:id", zValidator("json", updateBookingSchema.partial()), async (c) => {
  const userId = c.get("jwtPayload")?.userId
  if (!userId) throw new HTTPException(401, { message: "No estás autenticado." })

  const data = c.req.valid("json")
  const bookingId = c.req.param("id")

  const prisma = await prismaClients.fetch(c.env.DATABASE_URL)
  const existingBooking = await prisma.booking.findFirst({
    where: { id: bookingId, userId },
    include: { hotel: true },
  })
  if (!existingBooking) return c.json({ error: "Booking no encontrado o no pertenece al usuario." }, 404)

  const updatedBooking = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      ...data,
      requiredFields: JSON.stringify(data.requiredFields),
      allowedFields: JSON.stringify(data.allowedFields),
      hotelId: existingBooking.hotelId, // exclude hotelId from update
    },
  })

  return c.json({ message: "Booking actualizado con éxito", updatedBooking })
})

booking.delete("/:id", async (c) => {
  const userId = c.get("jwtPayload")?.userId
  if (!userId) throw new HTTPException(401, { message: "No estás autenticado." })
  const bookingId = c.req.param("id")

  const prisma = await prismaClients.fetch(c.env.DATABASE_URL)
  const existingBooking = await prisma.booking.findFirst({
    where: { id: bookingId, userId },
    include: { hotel: true },
  })
  if (!existingBooking) return c.json({ error: "Booking no encontrado o no pertenece al usuario." }, 404)

  await prisma.booking.delete({ where: { id: bookingId } })
  return c.json({ message: "Booking eliminado con éxito" }, 200)
})

// list all bookings for a user's hotels
booking.get("/", async (c) => {
  const userId = c.get("jwtPayload")?.userId
  if (!userId) throw new HTTPException(401, { message: "No estás autenticado." })

  const prisma = await prismaClients.fetch(c.env.DATABASE_URL)
  const hotels = await prisma.hotel.findMany({
    where: { userId },
    include: {
      bookings: true,
    },
  })

  return c.json(hotels)
})

booking.get("/:hotelId", async (c) => {
  const userId = c.get("jwtPayload")?.userId
  if (!userId) throw new HTTPException(401, { message: "No estás autenticado." })

  const prisma = await prismaClients.fetch(c.env.DATABASE_URL)
  const hotelId = c.req.param("hotelId") as string

  const bookings = await prisma.booking.findMany({
    where: { hotelId },
    include: {
      hotel: true,
      paxs: true,
    },
  })
  return c.json(bookings)
})

export default booking
