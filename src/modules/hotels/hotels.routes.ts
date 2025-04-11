import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { App } from "../../types"
import { createCuidSchema } from "../../utils/create-cuid-schema"
import { createHotelSchema, updateHotelSchema } from "./hotels.schema"
import * as hotelService from "./hotels.service"

const hotel = new Hono<App>()

hotel.get("/", async (c) => {
  const userId = c.get("jwtPayload")?.userId
  const hotels = await hotelService.getHotels(c.get("db"), userId)
  return c.json(hotels)
})

hotel.get("/:id", zValidator("param", createCuidSchema("id")), async (c) => {
  const userId = c.get("jwtPayload").userId
  const hotelId = c.req.param("id")
  const hotel = await hotelService.getHotel(c.get("db"), userId, hotelId)
  return c.json(hotel)
})

hotel.get("/:id/bookings", zValidator("param", createCuidSchema("id")), async (c) => {
  const userId = c.get("jwtPayload")?.userId
  const hotelId = c.req.param("id")
  const bookings = await hotelService.getBookingsByHotelId(c.get("db"), userId, hotelId)
  return c.json(bookings)
})

hotel.post("/", zValidator("json", createHotelSchema), async (c) => {
  const userId = c.get("jwtPayload")?.userId
  const data = c.req.valid("json")
  const hotel = await hotelService.createHotel(c.get("db"), userId, data)
  return c.json({ message: "Hotel creado con éxito", hotel }, 201)
})

hotel.put("/:id", zValidator("param", createCuidSchema("id")), zValidator("json", updateHotelSchema), async (c) => {
  const userId = c.get("jwtPayload")?.userId
  const data = c.req.valid("json")
  const hotelId = c.req.param("id")
  const hotel = await hotelService.updateHotel(c.get("db"), userId, hotelId, data)
  return c.json({ message: "Hotel actualizado con éxito", hotel })
})

hotel.delete("/:id", zValidator("param", createCuidSchema("id")), async (c) => {
  const userId = c.get("jwtPayload")?.userId
  const hotelId = c.req.param("id")
  await hotelService.deleteHotel(c.get("db"), userId, hotelId)
  return c.json({ message: "Hotel eliminado con éxito" })
})

export default hotel
