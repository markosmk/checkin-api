import { eq } from "drizzle-orm"
import { HTTPException } from "hono/http-exception"
import { users } from "../../db/schema"

import type { CreateUser, UpdateUser, UserData } from "./users.schema"
import type { DB } from "../../types"
import { hashPassword } from "../auth/auth.service"

export const getAllUsers = (db: DB): Promise<UserData[]> => {
  return db.query.users.findMany({
    columns: {
      password: false,
    },
  })
}

export const getUserById = async (db: DB, userId: string): Promise<UserData> => {
  const entity = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { password: false },
    with: {
      hotels: true,
      bookings: true,
    },
  })
  if (!entity) {
    throw new HTTPException(400, {
      message: `User with id ${userId} not found.`,
    })
  }
  return entity
}

export const getUserByEmail = async (db: DB, email: string): Promise<UserData> => {
  const entity = await db.query.users.findFirst({
    where: eq(users.email, email),
  })
  if (!entity) {
    throw new HTTPException(400, {
      message: `User with email ${email} not found.`,
    })
  }
  return entity
}

export const createUser = async (db: DB, input: CreateUser): Promise<UserData> => {
  const { password, ...restInput } = input

  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, input.email.toLowerCase()),
  })
  if (existingUser) {
    throw new HTTPException(409, {
      message: `El email ${input.email} ya está registrado.`,
    })
  }

  const hashedPassword = await hashPassword(password)

  const results = await db
    .insert(users)
    .values({
      ...restInput,
      email: input.email.toLowerCase(),
      password: hashedPassword,
      // subscriptionId: input.subscriptionId,
    })
    .returning()

  if (results?.length === 0) {
    throw new HTTPException(400, { message: "Error" })
  }
  const { password: toDelete, ...user } = results[0]
  return user
}

export const updateUser = async (db: DB, userId: string, input: UpdateUser): Promise<UserData> => {
  const { email, ...updateDataInput } = input

  const updateData: Partial<typeof users.$inferInsert> = { ...updateDataInput }

  if (Object.keys(updateData).length === 0) {
    throw new HTTPException(400, { message: "No hay datos para actualizar." })
  }

  const results = await db
    .update(users)
    .set({ ...updateData, updatedAt: new Date().toISOString() })
    .where(eq(users.id, userId))
    .returning()

  if (results.length === 0) {
    throw new HTTPException(400, {
      message: `User with id ${userId} not found.`,
    })
  }
  const [entity] = results
  return entity
}

export const deleteUser = async (db: DB, userId: string): Promise<UserData> => {
  const results = await db.delete(users).where(eq(users.id, userId)).returning()
  if (results.length === 0) {
    throw new HTTPException(400, {
      message: `User with id ${userId} not found.`,
    })
  }
  const [entity] = results
  return entity
}
