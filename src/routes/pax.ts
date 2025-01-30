import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import prismaClients from "../lib/prisma"
import { Variables } from "../types/jwt"
import { HTTPException } from "hono/http-exception"
import { jwtMiddleware } from "../middlewares/jwt"

const pax = new Hono<{ Bindings: Env; Variables: Variables }>()

pax.use("/*", jwtMiddleware)

export const createPaxSchema = z.object({
  bookingId: z.string(),
  firstname: z.string().min(1, "El Nombre es necesario."),
  lastname: z.string().min(1, "El Apellido es necesario."),
  email: z.string().min(1, "El Email es necesario."),
  phone: z.string(),
  docType: z.string(),
  docNumber: z.string(),
  birthdate: z.string().nullish(),
  nationalityCode: z.string().nullish(),
  city: z.string().nullish(),
  address: z.string().nullish(),
  postalCode: z.string().nullish(),
  arrivalDate: z.coerce.date().nullish(),
  departureDate: z.coerce.date().nullish(),
  carModel: z.string().nullish(),
  carPlate: z.string().nullish(),
  submittedAt: z.coerce.date().nullish(),
  lastEditPaxAt: z.coerce.date().nullish(),
  guestObservations: z.string().nullish(),
  files: z
    .object({
      docFrontPath: z.string().nullish(),
      docBackPath: z.string().nullish(),
      passportPath: z.string().nullish(),
      pdf_path: z.string().nullish(),
    })
    .optional(),
  //   booking: z
  //     .object({
  //       requiredFields: z.array(z.string()).default([]),
  //       allowedFields: z.array(z.string()).default([]),
  //     })
  //     .optional(),
})

pax.post("/", zValidator("json", createPaxSchema), async (c) => {
  const data = c.req.valid("json")
  const userId = c.get("jwtPayload")?.userId
  if (!userId) throw new HTTPException(401, { message: "No estás autenticado." })

  const bookingId = c.req.param("bookingId")
  if (!bookingId) throw new HTTPException(400, { message: "El bookingId es necesario." })
  const prisma = await prismaClients.fetch(c.env.DATABASE_URL)

  // Validación opcional del hotel
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, userId },
    select: { id: true },
  })
  if (!booking) throw new HTTPException(403, { message: "No tienes permiso para este booking." })

  const newPax = await prisma.pax.create({
    data: {
      ...data,
      bookingId,
    },
  })
  return c.json(newPax)
})

const updatePaxSchema = createPaxSchema.partial()
pax.put("/:id", zValidator("json", updatePaxSchema), async (c) => {
  const data = c.req.valid("json")
  const userId = c.get("jwtPayload")?.userId
  if (!userId) throw new HTTPException(401, { message: "No estás autenticado." })

  const paxId = c.req.param("id")
  if (!paxId) throw new HTTPException(400, { message: "El paxId es necesario." })
  const prisma = await prismaClients.fetch(c.env.DATABASE_URL)

  // Validar propiedad del pax
  const pax = await prisma.pax.findFirst({
    where: { id: paxId, booking: { userId } },
  })
  if (!pax) throw new HTTPException(403, { message: "No tienes permiso para actualizar este Pax." })

  const updatedPax = await prisma.pax.update({
    where: { id: paxId },
    data: {
      ...data,
      bookingId: pax.bookingId,
    },
  })
  return c.json(updatedPax)
})

pax.delete("/:id", async (c) => {
  const userId = c.get("jwtPayload")?.userId
  if (!userId) throw new HTTPException(401, { message: "No estás autenticado." })

  const paxId = c.req.param("id")
  if (!paxId) throw new HTTPException(400, { message: "El paxId es necesario." })
  const prisma = await prismaClients.fetch(c.env.DATABASE_URL)

  const pax = await prisma.pax.findFirst({
    where: { id: paxId, booking: { userId } },
  })
  if (!pax) throw new HTTPException(403, { message: "No tienes permiso para eliminar este Pax." })

  await prisma.pax.delete({ where: { id: paxId } })
  return c.json({ message: "Pax eliminado correctamente." })
})

// GET /pax?bookingId=
pax.get("/", async (c) => {
  const userId = c.get("jwtPayload")?.userId
  if (!userId) throw new HTTPException(401, { message: "No estás autenticado." })

  const bookingId = c.req.query("bookingId")
  const prisma = await prismaClients.fetch(c.env.DATABASE_URL)

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, userId },
    include: { paxs: true },
  })
  if (!booking) throw new HTTPException(404, { message: "Booking no encontrado." })

  return c.json(booking.paxs)
})

export default pax
