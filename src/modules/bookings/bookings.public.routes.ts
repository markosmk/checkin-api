import { Hono } from "hono"
import { HTTPException } from "hono/http-exception"
import { eq } from "drizzle-orm"

import type { App } from "../../types"
import { bookings, hotels, paxs } from "../../db/schema"
import { BookingStatus } from "../../db/enum"
import { sendEmail } from "../../lib/email"
import { EmailTemplate } from "../../lib/email-templates"

const publicBooking = new Hono<App>()

publicBooking.get("/", async (c) => {
  const bookingId = c.get("booking")?.id
  if (!bookingId) throw new HTTPException(400, { message: "ID de booking no proporcionado." })
  const db = c.get("db")
  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, bookingId),
    with: { paxs: true, hotel: true },
  })
  if (!booking) throw new HTTPException(404, { message: "Booking no encontrado." })

  const { paxs, hotel, ...bookingWithoutPaxs } = booking
  return c.json({ booking: bookingWithoutPaxs, paxs, hotel })
})

/**
 * allow Confirm in front only if:
 * paxs.length === booking.maxPaxs && paxs.every(p => p.submittedAt != null)
 */
publicBooking.post("/confirm", async (c) => {
  const booking = c.get("booking")
  const hotel = c.get("hotel")
  const { signature } = await c.req.json()
  const db = c.get("db")

  const paxes = await db.query.paxs.findMany({ where: eq(paxs.bookingId, booking.id) })
  if ((booking.maxPaxs && paxes.length !== booking.maxPaxs) || paxes.some((p) => !p.submittedAt)) {
    return c.json({ error: "Faltan completar datos de algunos huéspedes" }, 400)
  }

  const contact = paxes.find((p) => p.isContact)

  const [updated] = await db
    .update(bookings)
    .set({
      status: BookingStatus.COMPLETED,
      signature,
      // isLocked: true,
      completedAt: new Date().toISOString(),
    })
    .where(eq(bookings.id, booking.id))
    .returning({
      id: bookings.id,
      reservationId: bookings.reservationId,
      userId: bookings.userId,
      checkin: bookings.checkin,
      checkout: bookings.checkout,
    })

  const hotelWithEmail = await db.query.hotels.findFirst({
    where: eq(hotels.slug, hotel.slug),
    columns: {
      email: true,
    },
    with: {
      user: true,
    },
  })

  // use first hotel's email if not, then use email user.
  const hotelEmail = hotelWithEmail?.email ?? hotelWithEmail?.user?.email ?? ""
  if (hotelEmail && updated && contact) {
    await sendEmail({
      to: hotelEmail,
      subject: "Checkin confirmado",
      template: EmailTemplate.CHECKIN_COMPLETED,
      vars: {
        // TODO: fix correct link panel
        adminLink: `${c.env.FRONTEND_URL}/admin/bookings/${updated.id}`,
        reservationId: updated.reservationId,
        checkinDate: booking.checkin,
        checkinTime: booking.checkin, // take only hour
        hotelManagerName: hotelWithEmail?.user?.name ?? "",
        contactName: contact.firstname,
        hotelName: hotel.name,
      },
      envs: c.env,
    })
  }

  return c.json({ success: true, message: "Check in confirmado" })
})

export default publicBooking
