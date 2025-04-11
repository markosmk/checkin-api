import type { Context, Next } from "hono"
import { App } from "../types"
import { eq } from "drizzle-orm"
import { bookings } from "../db/schema"
import { BookingStatus } from "../db/enum"
import { z } from "zod"
import { cuidSchema } from "../utils/create-cuid-schema"
import { slugSchema } from "../modules/hotels/hotels.schema"
import { createToken, verifyToken } from "../utils/security"

const paramsSchema = z.object({
  slug: slugSchema,
  bookingId: cuidSchema,
})

export const publicMiddleware = async (c: Context<App>, next: Next) => {
  // FIX: test is parse errors is working
  const params = await paramsSchema.parseAsync(c.req.param())
  const { slug, bookingId } = params

  const authToken = c.req.header("Authorization")
  let payload
  if (authToken) {
    const [authScheme, token] = authToken.split(" ") as [string, string | undefined]
    if (authScheme !== "Bearer" || !token) {
      payload = null
    } else {
      payload = await verifyToken(token, c.env.SECRET_KEY_RESERVATION)
    }
  }

  let booking, hotel
  if (payload && payload.bookingId === bookingId && payload.slug === slug) {
    booking = {
      id: payload.booking.id,
      checkin: payload.booking.checkin,
      status: payload.booking.status,
      maxPaxs: payload.booking.maxPaxs,
    }
    hotel = { slug: payload.slug, name: payload.hotel.name }
  } else {
    const db = c.get("db")
    const bookingData = await db.query.bookings.findFirst({
      where: eq(bookings.id, bookingId),
      with: {
        hotel: {
          columns: { name: true, slug: true, isPublic: true, isActive: true },
        },
      },
    })

    if (!bookingData) {
      return c.json({ error: "La Reserva no fue encontrada" }, 404)
    }
    if (bookingData.hotel.slug !== slug) {
      return c.json({ error: "El Hotel no existe" }, 401)
    }
    if (!bookingData.hotel.isPublic) {
      return c.json({ error: "El Hotel no es publico o no esta disponible." }, 401)
    }
    // when cancel reservation in panel
    if (!bookingData.hotel.isActive) {
      return c.json({ error: "Reserva inactiva" }, 401)
    }
    // when block automatic, for example a trigger (p. ej. firma subida).
    if (bookingData.isLocked) {
      return c.json({ error: "Reserva bloqueada" }, 401)
    }
    // only available before 48h, and status isnot COMPLETED
    const now = new Date()
    const checkinDate = new Date(bookingData.checkin)
    if (now < new Date(checkinDate.getTime() - 1000 * 60 * 60 * 24 * 2)) {
      return c.json({ error: "Checkin aún no habilitado" }, 401)
    }
    if (bookingData.status === BookingStatus.COMPLETED) {
      return c.json({ error: "Checkin ya completado" }, 401)
    }

    // checking maxpaxs allowed
    //   if (booking.maxPaxs && booking.paxs.length >= booking.maxPaxs) {
    //     throw new HTTPException(403, {
    //       message: `Este check-in solo permite hasta ${booking.maxPaxs} huéspedes.`,
    //     })
    //   }

    booking = {
      id: bookingData.id,
      checkin: bookingData.checkin,
      status: bookingData.status,
      maxPaxs: bookingData.maxPaxs,
    }
    hotel = { slug: bookingData.hotel.slug, name: bookingData.hotel.name }

    // jwt to not make repeat the same request
    const newToken = await createToken(
      {
        booking: {
          id: bookingData.id,
          checkin: bookingData.checkin,
          status: bookingData.status as BookingStatus,
          maxPaxs: bookingData.maxPaxs,
        },
        hotel: {
          name: bookingData.hotel.name,
          slug: bookingData.hotel.slug,
        },
      },
      c.env.SECRET_KEY_RESERVATION,
      20 // min
    )

    c.header("X-Checkin-Token", newToken)
  }

  c.set("booking", booking)
  c.set("hotel", hotel)
  // c.set('allowedFields', bookingData.allowedFields ?? hotelData.allowedFields)
  // en each POST/PUT -> filter body to keep keys in c.get('allowedFields'). so no validate others fields and save only allowed.
  await next()
}
