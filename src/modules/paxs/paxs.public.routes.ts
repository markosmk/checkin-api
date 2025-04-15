import { Hono } from "hono"
import { HTTPException } from "hono/http-exception"
import { zValidator } from "@hono/zod-validator"
import { and, eq } from "drizzle-orm"
import { z } from "zod"

import type { App } from "../../types"
import { paxUpdateSchema } from "./paxs.schema"
import { createCuidSchema } from "../../utils/create-cuid-schema"
import { paxs } from "../../db/schema"

const publicPax = new Hono<App>()

// create empty pax
publicPax.post(
  "/create-empty",
  zValidator("json", z.object({ bookingId: z.string().min(1, "El bookingId es necesario.") })),
  async (c) => {
    const { bookingId } = c.req.valid("json")
    const bookingCtx = c.get("booking")
    if (bookingId !== bookingCtx?.id) throw new HTTPException(403, { message: "Acceso denegado." })

    const db = c.get("db")

    const newPax = await db.insert(paxs).values({
      bookingId: bookingCtx.id,
      firstname: "",
      lastname: "",
      email: "",
      phone: "",
      docType: "",
      docNumber: "",
      isContact: false,
    })

    return c.json(newPax)
  }
)

publicPax.get("/:id", zValidator("param", createCuidSchema("id")), async (c) => {
  const paxId = c.req.valid("param")?.id
  const db = c.get("db")
  const pax = await db.query.paxs.findFirst({
    where: eq(paxs.id, paxId),
    with: { booking: true },
  })
  if (!pax) throw new HTTPException(404, { message: "Pax no encontrado." })

  const { booking, ...paxWithoutBooking } = pax
  return c.json({ pax: paxWithoutBooking, booking })
})

publicPax.put("/:id", zValidator("param", createCuidSchema("id")), zValidator("json", paxUpdateSchema), async (c) => {
  const data = c.req.valid("json")
  const paxId = c.req.valid("param")?.id
  const db = c.get("db")
  const hotel = c.get("hotel")
  const booking = c.get("booking")

  const pax = await db.query.paxs.findFirst({
    where: and(eq(paxs.id, paxId)),
    with: { booking: true },
  })
  if (!pax) throw new HTTPException(404, { message: "Pax no encontrado." })

  if (pax.booking.id !== booking.id || pax.booking.hotelId !== hotel.id)
    throw new HTTPException(403, { message: "Acceso denegado." })

  if (!pax.submittedAt) {
    data.submittedAt = new Date().toISOString()
  }

  const [updatedPax] = await db
    .update(paxs)
    .set({
      ...data,
      bookingId: pax.bookingId,
    })
    .where(eq(paxs.id, pax.id))
    .returning()

  // optional
  // if (data.isContact && !pax.isContact) {
  //   // dismark before 's users
  //   await db
  //     .update(paxs)
  //     .set({ isContact: false })
  //     .where(and(eq(paxs.bookingId, pax.bookingId), eq(paxs.isContact, true)))

  //   // mark current
  //   await db.update(paxs).set({ isContact: true }).where(eq(paxs.id, pax.id))
  // }

  return c.json(updatedPax)
})

// TODO: method to update verify individual fields PATCH?

publicPax.delete("/:id", zValidator("param", createCuidSchema("id")), async (c) => {
  const paxId = c.req.valid("param")?.id
  const db = c.get("db")
  const hotel = c.get("hotel")
  const booking = c.get("booking")

  const pax = await db.query.paxs.findFirst({
    where: eq(paxs.id, paxId), // TODO: eq(bookings.id, booking.id)
    with: { booking: true },
  })
  if (!pax) throw new HTTPException(404, { message: "Pax no encontrado." })

  if (pax.booking.id !== booking.id || pax.booking.hotelId !== hotel.id) {
    throw new HTTPException(403, { message: "Acceso denegado." })
  }

  await db.delete(paxs).where(eq(paxs.id, pax.id))
  return c.json({ message: "Pax eliminado correctamente." })
})

export default publicPax
