import { Hono } from "hono"
import prismaClients from "../lib/prisma"
import { Variables } from "../types/jwt"
import { HTTPException } from "hono/http-exception"

const publicHotel = new Hono<{ Bindings: Env; Variables: Variables }>()

publicHotel.get("/:slug", async (c) => {
  const slug = c.req.param("slug")
  if (!slug) throw new HTTPException(400, { message: "Slug es necesario." })

  const prisma = await prismaClients.fetch(c.env.DATABASE_URL)
  const hotel = await prisma.hotel.findUnique({ where: { slug, isPublic: true } })
  if (!hotel) throw new HTTPException(404, { message: "Hotel no encontrado o no es público." })

  return c.json(hotel)
})

export default publicHotel
