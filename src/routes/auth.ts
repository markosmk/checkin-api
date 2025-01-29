import { Hono } from "hono"
import { HTTPException } from "hono/http-exception"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { sign } from "hono/jwt"

import prismaClients from "../lib/prisma"
import { sendEmail } from "../lib/email"
import { SubscriptionPlan } from "@prisma/client"

/** 24 hours */
const EXPIRE_TIME_VERIFICATION = 1000 * 60 * 60 * 24
/** 1 hour */
const EXPIRE_TIME_RESET_PASSWORD = 1000 * 60 * 60 * 1
/** 5 min */
const TIME_THROTTLE = 1000 * 60 * 5
/** 30 days */
const TRIAL_PERIOD = 1000 * 60 * 60 * 24 * 30

const auth = new Hono<{ Bindings: Env }>()

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
  selectedPlan: z
    .enum([SubscriptionPlan.free, SubscriptionPlan.pro, SubscriptionPlan.business])
    .default(SubscriptionPlan.free),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

auth.post("/register", zValidator("json", registerSchema), async (c) => {
  const { email, password, name, selectedPlan } = c.req.valid("json")

  const prisma = await prismaClients.fetch(c.env.DB)
  try {
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      if (existingUser.emailVerified) {
        throw new HTTPException(409, { message: "El correo ya está registrado y activado." })
      }

      if (existingUser.tempToken) {
        throw new HTTPException(409, {
          message:
            "Ya tienes una cuenta pendiente de activación. Revisa tu email para activarla. Puedes intentar reenviar el email de verificación.",
          // in front show button to resend email // resend-verification
        })
      }

      throw new HTTPException(409, { message: "El correo ya está registrado." })
    }

    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)
    const tempToken = crypto.randomUUID()

    const user = await prisma.user.create({
      data: {
        email,
        hashedPassword,
        name,
        tempToken,
        tempTokenExpires: new Date(Date.now() + EXPIRE_TIME_VERIFICATION),
        subscription: {
          create: {
            plan: selectedPlan === SubscriptionPlan.pro ? SubscriptionPlan.pro : SubscriptionPlan.free,
            trialEndsAt: selectedPlan === SubscriptionPlan.pro ? new Date(Date.now() + TRIAL_PERIOD) : null,
          },
        },
      },
    })

    await sendEmail({
      to: email,
      subject: "Verifica tu correo electrónico",
      html: `Haz clic en el siguiente enlace para verificar tu correo: <a href="${c.env.FRONTEND_URL}/verify-email?token=${tempToken}">Verificar correo</a>`,
      apiKey: c.env.SERVICE_EMAIL_API_KEY,
    })

    return c.json({ message: "Registro exitoso. Revisa tu email para activarlo." }, 201)
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

  if (!user.emailVerified) {
    throw new HTTPException(403, { message: "Debes verificar tu correo para continuar." })
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

auth.post("/reset-password", zValidator("json", resetPasswordSchema), async (c) => {
  const { token, newPassword } = c.req.valid("json")

  const prisma = await prismaClients.fetch(c.env.DB)
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

auth.get("/verify-email", async (c) => {
  const { token } = c.req.query()
  if (!token) throw new HTTPException(400, { message: "Token no proporcionado." })

  const prisma = await prismaClients.fetch(c.env.DB)
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

auth.post("/resend-verification", zValidator("json", z.object({ email: z.string().email() })), async (c) => {
  const { email } = c.req.valid("json")

  const prisma = await prismaClients.fetch(c.env.DB)
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

export default auth
