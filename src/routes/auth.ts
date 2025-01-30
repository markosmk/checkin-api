import { Hono } from "hono"
import { HTTPException } from "hono/http-exception"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { sign } from "hono/jwt"

import prismaClients from "../lib/prisma"
import { sendEmail } from "../lib/email"
import { SubscriptionPlan } from "@prisma/client"
import { EXPIRE_TIME_VERIFICATION, TRIAL_PERIOD } from "../config/constants"

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

  const prisma = await prismaClients.fetch(c.env.DATABASE_URL)
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
    } else if (error instanceof HTTPException) {
      if (error.message && error.status) {
        throw new HTTPException(error.status, { message: error.message })
      }
    }
    console.log(error)
    throw new HTTPException(500, { message: "Error al registrar el usuario." })
  }
})

auth.post("/login", zValidator("json", loginSchema), async (c) => {
  const { email, password } = c.req.valid("json")

  const prisma = await prismaClients.fetch(c.env.DATABASE_URL)

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

export default auth
