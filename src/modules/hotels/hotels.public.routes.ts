import { Hono } from "hono"
import { HTTPException } from "hono/http-exception"
import { App } from "../../types"
import { zValidator } from "@hono/zod-validator"
import { and, eq } from "drizzle-orm"
import { bookings, hotels } from "../../db/schema"
import { z } from "zod"
import { slugSchema } from "./hotels.schema"
import { reservationIdSchema } from "../bookings/bookings.schema"

const publicHotel = new Hono<App>()

publicHotel.get("/hotel/:slug", zValidator("param", z.object({ slug: slugSchema })), async (c) => {
  const slug = c.req.param("slug")
  const db = c.get("db")
  const hotel = await db.query.hotels.findFirst({ where: and(eq(hotels.slug, slug), eq(hotels.isPublic, true)) })
  if (!hotel) throw new HTTPException(404, { message: "Hotel no encontrado." })
  if (!hotel.isActive) throw new HTTPException(401, { message: "Hotel no esta disponible." })
  return c.json(hotel)
})

// TODO: add to limit
publicHotel.post(
  "/check-reservation",
  zValidator("json", z.object({ slug: slugSchema, reservationId: reservationIdSchema, lastName: z.string() })),
  async (c) => {
    const { slug: slugHotel, reservationId, lastName } = c.req.valid("json")

    try {
      const db = c.get("db")
      const hotel = await db.query.hotels.findFirst({ where: eq(hotels.slug, slugHotel) })
      if (!hotel) return c.json({ exists: false, message: "Hotel no encontrada." })

      const booking = await db.query.bookings.findFirst({
        where: and(eq(bookings.reservationId, reservationId), eq(bookings.hotelId, hotel.id)),
        with: {
          paxs: { columns: { isContact: true, lastname: true } },
        },
      })
      // TODO: unify conditionals lastname and not found
      if (!booking) return c.json({ exists: false, message: "Reserva no encontrada." })
      // TODO: checking if exist lastname
      const paxContact = booking.paxs.find((pax) => pax.isContact)
      if (paxContact?.lastname !== lastName) return c.json({ exists: false, message: "Apellido no coincide." })

      return c.json({
        exists: true,
        bookingId: booking.id,
        message: "Reserva encontrada. Redirigiendo...",
      })
    } catch (error) {
      // console.error("Error in /check-reservation:", error);
      return c.json({ exists: false, message: "Error interno del servidor." }, 500)
    }
  }
)

export default publicHotel
