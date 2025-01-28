import { Hono } from "hono"
import { HTTPException } from "hono/http-exception"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { sign } from "hono/jwt"

import prismaClients from "../lib/prisma"

const auth = new Hono<{ Bindings: Env }>()

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

auth.post("/register", zValidator("json", registerSchema), async (c) => {
  const { email, password, name } = c.req.valid("json")

  const salt = await bcrypt.genSalt(10)
  const hashedPassword = await bcrypt.hash(password, salt)

  const prisma = await prismaClients.fetch(c.env.DB)
  try {
    const user = await prisma.user.create({
      data: { email, hashedPassword, name },
    })

    const token = await sign({ userId: user.id }, c.env.SECRET_KEY)

    return c.json({ message: "Usuario registrado", user: { email, name }, token }, 201)
  } catch (error: any) {
    if (error?.code === "P2002") {
      throw new HTTPException(409, { message: "El correo electrónico ya está en uso." })
    }
    throw new HTTPException(500, { message: "Error al registrar el usuario." })
  }
})

auth.post("/login", zValidator("json", loginSchema), async (c) => {
  const { email, password } = c.req.valid("json")

  const prisma = await prismaClients.fetch(c.env.DB)

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    throw new HTTPException(401, { message: "Credenciales inválidas" })
  }

  const isPasswordValid = await bcrypt.compare(password, user.hashedPassword)
  if (!isPasswordValid) {
    throw new HTTPException(401, { message: "Credenciales inválidas" })
  }

  const token = await sign({ userId: user.id }, c.env.SECRET_KEY)
  return c.json({ message: "Inicio de sesión exitoso", user: { email: user.email }, token })
})

export default auth
