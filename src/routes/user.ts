import { Hono } from "hono"
import { HTTPException } from "hono/http-exception"
import prismaClients from "../lib/prisma"

import { jwtMiddleware } from "../middlewares/jwt"
import type { Variables } from "../types/jwt"

const user = new Hono<{ Bindings: Env; Variables: Variables }>()

user.use("/*", jwtMiddleware)

user.get("/profile", async (c) => {
  const payload = c.get("jwtPayload")
  const userId = payload.userId

  const prisma = await prismaClients.fetch(c.env.DB)
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    throw new HTTPException(404, { message: "Usuario no encontrado" })
  }

  const { hashedPassword, ...userWithoutPassword } = user
  return c.json(userWithoutPassword)
})

user.put("/profile", async (c) => {
  const payload = c.get("jwtPayload")
  const userId = payload.userId

  const { name, email } = await c.req.json()

  const prisma = await prismaClients.fetch(c.env.DB)
  const user = await prisma.user.update({
    where: { id: userId },
    data: { name, email },
  })
  if (!user) {
    throw new HTTPException(404, { message: "Usuario no encontrado" })
  }

  const { hashedPassword, ...userWithoutPassword } = user
  return c.json({ message: "Usuario actualizado", user: userWithoutPassword })
})

export default user
