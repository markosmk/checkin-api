import { Hono } from "hono"
import { App } from "../../types"
import { zValidator } from "@hono/zod-validator"
import { paxInserSchema, paxUpdateSchema } from "./paxs.schema"
import * as paxService from "./paxs.service"
import { createCuidSchema } from "../../utils/create-cuid-schema"

const pax = new Hono<App>()

pax.post("/", zValidator("json", paxInserSchema), async (c) => {
  const data = c.req.valid("json")
  const userId = c.get("user")?.id
  const newPax = await paxService.createPax(c.get("db"), userId, data)
  return c.json(newPax)
})

pax.put("/:id", zValidator("param", createCuidSchema("id")), zValidator("json", paxUpdateSchema), async (c) => {
  const data = c.req.valid("json")
  const userId = c.get("user")?.id
  const { id } = c.req.valid("param")
  const updatedPax = await paxService.updatePax(c.get("db"), id, userId, data)
  return c.json(updatedPax)
})

pax.delete("/:id", zValidator("param", createCuidSchema("id")), async (c) => {
  const userId = c.get("user")?.id
  const { id } = c.req.valid("param")
  await paxService.deletePax(c.get("db"), id, userId)
  return c.json({ message: "Pax eliminado correctamente." })
})

// GET /pax?bookingId=
pax.get("/", zValidator("query", createCuidSchema("bookingId")), async (c) => {
  const userId = c.get("user")?.id
  const { bookingId } = c.req.valid("query")
  const paxsList = await paxService.getPaxsByBookingId(c.get("db"), bookingId, userId)
  return c.json(paxsList)
})

pax.get("/:id", zValidator("param", createCuidSchema("id")), async (c) => {
  const userId = c.get("user")?.id
  const { id } = c.req.valid("param")
  const pax = await paxService.getPaxById(c.get("db"), id, userId)
  return c.json(pax)
})

export default pax
