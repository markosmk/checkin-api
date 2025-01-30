import { Hono } from "hono"
import { HTTPException } from "hono/http-exception"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import bcrypt from "bcryptjs"

import prismaClients from "../lib/prisma"
import { sendEmail } from "../lib/email"
import { EXPIRE_TIME_RESET_PASSWORD, EXPIRE_TIME_VERIFICATION, TIME_THROTTLE } from "../config/constants"

const authExtended = new Hono<{ Bindings: Env }>()

const forgotPasswordSchema = z.object({
  email: z.string().email(),
})

authExtended.post("/forgot-password", zValidator("json", forgotPasswordSchema), async (c) => {
  const { email } = c.req.valid("json")

  const prisma = await prismaClients.fetch(c.env.DATABASE_URL)
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    throw new HTTPException(404, { message: "Usuario no encontrado." })
  }

  if (!user.emailVerified) {
    throw new HTTPException(403, { message: "Estas intentando restablecer tu contraseña sin verificar tu correo." })
  }

  const tempToken = crypto.randomUUID()
  await prisma.user.update({
    where: { email },
    data: {
      tempToken,
      tempTokenExpires: new Date(Date.now() + EXPIRE_TIME_RESET_PASSWORD),
    },
  })

  await sendEmail({
    to: user.email,
    subject: "Recupera tu contraseña",
    html: `<p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p>
             <a href="${c.env.FRONTEND_URL}/reset-password?token=${tempToken}">Restablecer contraseña</a>`,
    apiKey: c.env.SERVICE_EMAIL_API_KEY,
  })

  return c.json({ message: "Email enviado con instrucciones para restablecer tu contraseña." })
})

const resetPasswordSchema = z.object({ token: z.string(), newPassword: z.string().min(6) })

authExtended.post("/reset-password", zValidator("json", resetPasswordSchema), async (c) => {
  const { token, newPassword } = c.req.valid("json")

  const prisma = await prismaClients.fetch(c.env.DATABASE_URL)
  const user = await prisma.user.findFirst({
    where: { tempToken: token, tempTokenExpires: { gte: new Date() } },
  })
  if (!user) {
    throw new HTTPException(400, { message: "Token inválido o expirado." })
  }

  const salt = await bcrypt.genSalt(10)
  const hashedPassword = await bcrypt.hash(newPassword, salt)

  await prisma.user.update({
    where: { id: user.id },
    data: { hashedPassword, tempToken: null, tempTokenExpires: null },
  })

  return c.json({ message: "Contraseña actualizada correctamente." })
})

authExtended.get("/verify-email", async (c) => {
  const { token } = c.req.query()
  if (!token) throw new HTTPException(400, { message: "Token no proporcionado." })

  const prisma = await prismaClients.fetch(c.env.DATABASE_URL)
  const user = await prisma.user.findFirst({
    where: { tempToken: token, tempTokenExpires: { gte: new Date() } },
  })

  if (!user) {
    throw new HTTPException(400, { message: "Token inválido o expirado." })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      tempToken: null,
      tempTokenExpires: null,
    },
  })

  return c.json({ message: "Correo verificado. Ahora puedes acceder al panel." })
})

authExtended.post("/resend-verification", zValidator("json", z.object({ email: z.string().email() })), async (c) => {
  const { email } = c.req.valid("json")

  const prisma = await prismaClients.fetch(c.env.DATABASE_URL)
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    throw new HTTPException(404, { message: "Usuario no encontrado." })
  }

  if (user.emailVerified) {
    throw new HTTPException(400, { message: "El correo ya está verificado." })
  }

  const lastRequest = user.tempTokenExpires ? new Date(user.tempTokenExpires).getTime() : 0
  const now = Date.now()

  if (now - lastRequest < TIME_THROTTLE) {
    throw new HTTPException(429, { message: "Espera unos minutos antes de solicitar otro email." })
  }

  const tempToken = crypto.randomUUID()

  await prisma.user.update({
    where: { id: user.id },
    data: {
      tempToken,
      tempTokenExpires: new Date(now + EXPIRE_TIME_VERIFICATION),
    },
  })

  await sendEmail({
    to: email,
    subject: "Verifica tu correo electrónica",
    html: `Haz clic en el siguiente enlace para verificar tu correo: <a href="${c.env.FRONTEND_URL}/verify-email?token=${tempToken}">Verificar correo</a>`,
    apiKey: c.env.SERVICE_EMAIL_API_KEY,
  })

  return c.json({ message: "Se ha enviado un nuevo correo de verificación." })
})

export default authExtended
