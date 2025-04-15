import type { z } from "zod"
import type { DB } from "../../types"
import type { paxInserSchema, paxUpdateSchema } from "./paxs.schema"
import { and, eq } from "drizzle-orm"
import { HTTPException } from "hono/http-exception"
import { bookings, paxs } from "../../db/schema"

export const createPax = async (db: DB, userId: string, data: z.infer<typeof paxInserSchema>) => {
  const booking = await db.query.bookings.findFirst({
    where: and(eq(bookings.id, data.bookingId), eq(bookings.userId, userId)),
  })
  if (!booking) throw new HTTPException(403, { message: "No tienes permiso para este booking." })

  const newPaxs = await db
    .insert(paxs)
    .values({ ...data, bookingId: booking.id })
    .returning()
  return newPaxs[0]
}

export const getPaxsByBookingId = async (db: DB, bookingId: string, userId: string) => {
  const booking = await db.query.bookings.findFirst({
    where: and(eq(bookings.id, bookingId), eq(bookings.userId, userId)),
    with: {
      paxs: true,
    },
  })

  if (!booking) throw new HTTPException(404, { message: "Booking no encontrado." })

  // const paxsBooking = await db.query.paxs.findMany({
  //   where: eq(paxs.bookingId, bookingId),
  // })
  return booking
}

export const getPaxById = async (db: DB, paxId: string, userId: string) => {
  const pax = await db.query.paxs.findFirst({
    where: eq(paxs.id, paxId),
    with: {
      booking: true,
    },
  })
  if (!pax) throw new HTTPException(404, { message: "Pax no encontrado." })
  if (pax?.booking.userId !== userId) throw new HTTPException(403, { message: "No tienes permiso para este Pax." })

  return pax
}

export const updatePax = async (db: DB, paxId: string, userId: string, data: z.infer<typeof paxUpdateSchema>) => {
  const pax = await db.query.paxs.findFirst({
    where: eq(paxs.id, paxId),
    with: {
      booking: true,
    }, //{ id: paxId, booking: { userId } },
  })
  if (!pax) throw new HTTPException(403, { message: "No existe el Pax." })

  if (pax?.booking.userId !== userId)
    throw new HTTPException(403, { message: "No tienes permiso para actualizar este Pax." })

  const updatedPax = await db
    .update(paxs)
    .set({
      ...data,
      bookingId: pax.bookingId, // Hard to evit add this
      updatedAt: new Date().toISOString(),
    })
    .where(eq(paxs.id, paxId))
    .returning()

  return updatedPax[0]
}

export const deletePax = async (db: DB, paxId: string, userId: string) => {
  const pax = await db.query.paxs.findFirst({
    where: eq(paxs.id, paxId),
    with: {
      booking: true,
    },
  })
  if (!pax) throw new HTTPException(404, { message: "No existe el Pax." })
  if (pax?.booking.userId !== userId)
    throw new HTTPException(403, { message: "No tienes permiso para eliminar este Pax." })

  const deletedPax = await db.delete(paxs).where(eq(paxs.id, paxId)).returning()
  return deletedPax[0]
}
