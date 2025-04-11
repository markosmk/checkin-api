import { and, eq } from "drizzle-orm"
import { HTTPException } from "hono/http-exception"
import { bookings, hotels } from "../../db/schema"
import { CreateHotel, UpdateHotel } from "./hotels.schema"
import { DB } from "../../types"

export const getHotels = async (db: DB, userId: string) => {
  return db.query.hotels.findMany({ where: eq(hotels.userId, userId) })
}

export const getHotel = async (db: DB, userId: string, hotelId: string) => {
  const hotel = await db.query.hotels.findFirst({
    where: and(eq(hotels.id, hotelId), eq(hotels.userId, userId)),
    with: {
      bookings: true,
    },
  })
  if (!hotel) {
    throw new HTTPException(404, { message: "Hotel no encontrado." })
  }
  return hotel
}

export const getBookingsByHotelId = async (db: DB, userId: string, hotelId: string) => {
  const hotel = await db.query.hotels.findFirst({ where: eq(hotels.id, hotelId) })
  if (!hotel || hotel.userId !== userId) {
    throw new HTTPException(404, { message: "Hotel no encontrado o no pertenece al usuario." })
  }
  const bookingsBy = await db.query.bookings.findMany({
    where: and(eq(bookings.hotelId, hotelId), eq(bookings.userId, userId)),
    with: {
      hotel: true,
    },
  })
  return bookingsBy
}

export const createHotel = async (db: DB, userId: string, data: CreateHotel) => {
  const existingHotel = await db.query.hotels.findFirst({ where: eq(hotels.slug, data.slug) })
  if (existingHotel) {
    throw new HTTPException(409, { message: "El slug ya está en uso." })
  }

  const hotel = await db
    .insert(hotels)
    .values({ ...data, allowedFields: [], userId })
    .returning()
  return hotel
}

export const updateHotel = async (db: DB, userId: string, hotelId: string, data: UpdateHotel) => {
  const currentHotel = await db.query.hotels.findFirst({ where: eq(hotels.id, hotelId) })
  if (!currentHotel || currentHotel.userId !== userId) {
    throw new HTTPException(404, { message: "Hotel no encontrado o no pertenece al usuario." })
  }

  if (data.slug && data.slug !== currentHotel.slug) {
    const existingHotelWithSlug = await db.query.hotels.findFirst({ where: eq(hotels.slug, data.slug) })
    if (existingHotelWithSlug) {
      throw new HTTPException(409, { message: "El slug ya está en uso." })
    }
  }

  const updatedHotel = await db.update(hotels).set(data).where(eq(hotels.id, hotelId)).returning()
  return updatedHotel
}

export const deleteHotel = async (db: DB, userId: string, hotelId: string) => {
  const currentHotel = await db.query.hotels.findFirst({ where: eq(hotels.id, hotelId) })
  if (!currentHotel || currentHotel.userId !== userId) {
    throw new HTTPException(404, { message: "Hotel no encontrado o no pertenece al usuario." })
  }

  const result = await db.delete(hotels).where(eq(hotels.id, hotelId))
  if (!result || !result.success) {
    throw new HTTPException(500, { message: "Error al eliminar el hotel." })
  }
  return { status: true }
}
