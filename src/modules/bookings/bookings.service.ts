import { and, eq } from "drizzle-orm"
import type { DB } from "../../types"
import { bookings, hotels, paxs } from "../../db/schema"
import { HTTPException } from "hono/http-exception"
import type { CreateBookingInput, UpdateBookingInput } from "./bookings.schema"
import { BookingStatus } from "../../db/enum"

export const createBooking = async (db: DB, userId: string, data: CreateBookingInput) => {
  const hotel = await db.query.hotels.findFirst({
    where: and(eq(hotels.userId, userId), eq(hotels.id, data.hotelId)),
  })
  if (!hotel) {
    throw new HTTPException(404, { message: "Hotel no encontrado" })
  }

  // verify si el reservationId del booking no existe en otro booking del mismo hotel
  const existingReservationId = await db.query.bookings.findFirst({
    where: and(eq(bookings.hotelId, data.hotelId), eq(bookings.reservationId, data.reservationId)),
  })

  if (existingReservationId)
    throw new HTTPException(400, { message: "El reservationId ya existe en otro booking del mismo hotel." })

  const { client, ...dataWithoutClient } = data
  const dataToUpdate = {
    ...dataWithoutClient,
    // requiredFields: data.requiredFields,
    // allowedFields: data.allowedFields,
    userId,
    hotelId: data.hotelId,
    status: BookingStatus.PENDING,
  }
  const [booking] = await db.insert(bookings).values(dataToUpdate).returning({ id: bookings.id })
  if (!booking) throw new HTTPException(500, { message: "Error al crear la reserva." })

  await db.insert(paxs).values({
    bookingId: booking.id,
    firstname: client.firstname,
    lastname: client.lastname,
    email: client.email,
    phone: "",
    docType: "",
    docNumber: "",
    isContact: true,
    submittedAt: null,
  })

  return booking
}

export const getBookings = async (db: DB, userId: string, hotelId?: string) => {
  const results = await db.query.bookings.findMany({
    where: and(eq(bookings.userId, userId), hotelId ? eq(bookings.hotelId, hotelId) : undefined),
  })

  return results
}

export const getBookingById = async (db: DB, userId: string, bookingId: string) => {
  const results = await db.query.bookings.findFirst({
    where: and(eq(bookings.userId, userId), eq(bookings.id, bookingId)),
    with: {
      hotel: true,
      // paxs: true,
    },
  })
  return results
}

export const updateBooking = async (db: DB, userId: string, id: string, data: UpdateBookingInput) => {
  const existingBooking = await db.query.bookings.findFirst({
    where: and(eq(bookings.userId, userId), eq(bookings.id, id)),
  })
  if (!existingBooking) {
    throw new HTTPException(404, { message: "Reserva no encontrada o no te pertenece." })
  }

  // TODO: checking testing reservationId
  if (data.reservationId && data.reservationId !== existingBooking.reservationId) {
    const existingReservationId = await db.query.bookings.findFirst({
      where: and(
        eq(bookings.userId, userId),
        eq(bookings.reservationId, data.reservationId),
        eq(bookings.hotelId, existingBooking.hotelId)
      ),
    })
    if (existingReservationId) {
      throw new HTTPException(400, { message: "El reservationId ya existe en otro booking del mismo hotel." })
    }
  }

  // this optional
  if (data.hotelId !== existingBooking.hotelId) {
    throw new HTTPException(400, {
      message: "Estas intentando cambiar el hotel de una reserva o el nro de reserva no existe para ese hotel.",
    })
  }

  const results = await db
    .update(bookings)
    .set({
      ...data,
      // requiredFields: data.requiredFields,
      // allowedFields: data.allowedFields,
      hotelId: existingBooking.hotelId, // Hard To exclude hotelId from update
    })
    .where(and(eq(bookings.userId, userId), eq(bookings.id, id)))
    .returning()
  return results[0]
}

export const deleteBooking = async (db: DB, userId: string, bookingId: string) => {
  const currentBooking = await db.query.bookings.findFirst({ where: eq(bookings.id, bookingId) })
  if (!currentBooking || currentBooking.userId !== userId) {
    throw new HTTPException(404, { message: "Reserva no encontrada o no te pertenece." })
  }
  const result = await db.delete(bookings).where(and(eq(bookings.userId, userId), eq(bookings.id, bookingId)))

  if (!result || !result.success) {
    throw new HTTPException(500, { message: "Error al eliminar la reserva." })
  }
  return { status: true }
}
