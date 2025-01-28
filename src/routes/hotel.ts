import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"

const hotel = new Hono()

const hotelSchema = z.object({
  name: z.string().min(3),
  slug: z.string().min(3),
  phone: z.string().min(6),
})

hotel.post("/", zValidator("json", hotelSchema), async (c) => {
  const { name, slug, phone } = c.req.valid("json")

  return c.json({ message: "Hotel creado", name, slug, phone }, 201)
})

hotel.get("/:id", (c) => {
  const id = c.req.param("id")
  return c.json({ message: `Hotel con ID ${id}` })
})

export default hotel
