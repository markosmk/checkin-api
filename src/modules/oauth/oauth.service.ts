import { eq } from "drizzle-orm"
import { HTTPException } from "hono/http-exception"
import { users } from "../../db/schema"
import type { DB } from "../../types"

export const setPassword = async (db: DB, userId: string, newPassword: string) => {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  })
  if (!user) {
    throw new HTTPException(404, { message: "Usuario no encontrado" })
  }

  if (user.password) {
    throw new HTTPException(400, { message: "El usuario ya tiene una contraseña" })
  }

  const updatedUser = await db
    .update(users)
    .set({
      password: newPassword,
    })
    .where(eq(users.id, userId))
    .returning()

  return updatedUser[0]
}
