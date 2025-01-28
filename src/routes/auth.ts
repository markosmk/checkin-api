import { Hono } from "hono"
import { HTTPException } from "hono/http-exception"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { sign } from "hono/jwt"
// import { v4 as uuidv4 } from "uuid"
// import resend from "resend"

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

const forgotPasswordSchema = z.object({
  email: z.string().email(),
})

auth.post("/forgot-password", zValidator("json", forgotPasswordSchema), async (c) => {
  const { email } = c.req.valid("json")

  const prisma = await prismaClients.fetch(c.env.DB)
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    throw new HTTPException(404, { message: "Usuario no encontrado." })
  }

  // const resetToken = uuidv4()
  // const resetExpires = new Date(Date.now() + 60 * 60 * 1000)

  // await prisma.user.update({
  //   where: { email },
  //   data: { resetToken, resetExpires },
  // })

  // const resetLink = `${c.env.FRONTEND_URL}/reset-password?token=${resetToken}`

  // await resend.sendEmail({
  //   from: "noreply@tuapp.com",
  //   to: email,
  //   subject: "Restablece tu contraseña",
  //   html: `<p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p>
  //          <a href="${resetLink}">${resetLink}</a>`,
  // })

  return c.json({ message: "Email enviado con instrucciones para restablecer tu contraseña." })
})

const resetPasswordSchema = z.object({ token: z.string(), newPassword: z.string().min(6) })

auth.post("/reset-password", zValidator("json", resetPasswordSchema), async (c) => {
  const { token, newPassword } = c.req.valid("json")

  const prisma = await prismaClients.fetch(c.env.DB)
  // const user = await prisma.user.findFirst({
  //   where: { resetToken: token, resetExpires: { gte: new Date() } },
  // })
  // if (!user) {
  //   throw new HTTPException(400, { message: "Token inválido o expirado." })
  // }

  // const salt = await bcrypt.genSalt(10)
  // const hashedPassword = await bcrypt.hash(newPassword, salt)

  // await prisma.user.update({
  //   where: { id: user.id },
  //   data: { hashedPassword, resetToken: null, resetExpires: null },
  // })

  return c.json({ message: "Contraseña actualizada correctamente." })
})

export default auth
