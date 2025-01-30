import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import prismaClients from "../lib/prisma"
import { Variables } from "../types/jwt"
import { HTTPException } from "hono/http-exception"
import { jwtMiddleware } from "../middlewares/jwt"
import { planMiddleware } from "../middlewares/plan.middleware"

const hotel = new Hono<{ Bindings: Env; Variables: Variables }>()

hotel.use("/*", jwtMiddleware)
hotel.use("/*", planMiddleware)

const createHotelSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  slug: z.string().min(1, { message: "Slug is required" }),
  type: z.string(),
  subType: z.string().optional(),
  phone: z.string(),
  coverImage: z.string(),
  website: z.string().optional().default(""),
  rooms: z.coerce.number().int().positive(),
  isPublic: z.boolean().default(false),
  // options: z.object({
  //   maxChildrenAge: z.number().int().nullable(),
  // }).nullable(),
  // location: z.object({
  //   country: z.string(),
  //   province: z.string(),
  //   place: z.string(),
  //   address: z.string(),
  //   zipCode: z.string(),
  //   googlePlaceId: z.string().nullable(),
  //   longitude: z.string().nullable(),
  //   latitude: z.string().nullable(),
  // }).nullable(),
})

hotel.post("/", zValidator("json", createHotelSchema), async (c) => {
  const data = c.req.valid("json")
  const userId = c.get("jwtPayload")?.userId
  if (!userId) throw new HTTPException(401, { message: "No estás autenticados pa. " + userId })

  const prisma = await prismaClients.fetch(c.env.DATABASE_URL)
  const existingHotel = await prisma.hotel.findUnique({ where: { slug: data.slug } })
  if (existingHotel) {
    throw new HTTPException(409, { message: "El slug ya está en uso." })
  }

  const hotel = await prisma.hotel.create({
    data: { ...data, fieldsAllowed: "", userId },
  })

  return c.json({ message: "Hotel creado con éxito", hotel }, 201)
})

const updateHotelSchema = createHotelSchema.partial()
hotel.put("/:id", zValidator("json", updateHotelSchema), async (c) => {
  const data = c.req.valid("json")

  const userId = c.get("jwtPayload")?.userId
  if (!userId) throw new HTTPException(401, { message: "No estás autenticado." })
  const hotelId = c.req.param("id")
  const prisma = await prismaClients.fetch(c.env.DATABASE_URL)

  const hotel = await prisma.hotel.findUnique({ where: { id: hotelId } })
  if (!hotel || hotel.userId !== userId) {
    throw new HTTPException(403, { message: "No tienes permiso para actualizar este hotel." })
  }

  try {
    const updatedHotel = await prisma.hotel.update({
      where: { id: hotelId },
      data: { ...data },
    })

    return c.json({ message: "Hotel actualizado con éxito", updatedHotel })
  } catch (err: any) {
    if (err.code === "P2002") {
      throw new HTTPException(409, { message: "El slug ya está en usos." })
    }
    throw new HTTPException(500, { message: "Error interno del servidor." })
  }
})

hotel.delete("/:id", async (c) => {
  const userId = c.get("jwtPayload")?.userId
  if (!userId) throw new HTTPException(401, { message: "No estás autenticado." })

  const hotelId = c.req.param("id")
  const prisma = await prismaClients.fetch(c.env.DATABASE_URL)

  const hotel = await prisma.hotel.findUnique({ where: { id: hotelId } })
  if (!hotel || hotel.userId !== userId) {
    throw new HTTPException(403, { message: "No tienes permiso para eliminar este hotel." })
  }

  await prisma.hotel.delete({ where: { id: hotelId } })

  return c.json({ message: "Hotel eliminado con éxito" })
})

hotel.get("/", async (c) => {
  const userId = c.get("jwtPayload")?.userId
  if (!userId) throw new HTTPException(401, { message: "No estás autenticado." })
  const prisma = await prismaClients.fetch(c.env.DATABASE_URL)

  const hotels = await prisma.hotel.findMany({ where: { userId } })

  return c.json(hotels)
})

hotel.get("/:id", async (c) => {
  const userId = c.get("jwtPayload")?.userId
  if (!userId) throw new HTTPException(401, { message: "No estás autenticado." })

  const hotelId = c.req.param("id")
  const prisma = await prismaClients.fetch(c.env.DATABASE_URL)

  const hotel = await prisma.hotel.findUnique({ where: { id: hotelId, userId } })
  if (!hotel) {
    throw new HTTPException(404, { message: "Hotel no encontrado." })
  }

  return c.json(hotel)
})

export default hotel
