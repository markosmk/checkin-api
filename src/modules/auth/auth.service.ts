import { sign } from "hono/jwt"
import { and, eq } from "drizzle-orm"
import bcrypt from "bcryptjs"
import { HTTPException } from "hono/http-exception"
import { App, DB } from "../../types"
import { subscriptions, TypeUseToken, users, usersTokens } from "../../db/schema"
import { LoginSchemaInput, RegisterSchemaInput, ResetPasswordSchemaInput } from "./auth.schema"
import {
  EXPIRE_TIME_RESET_PASSWORD,
  EXPIRE_TIME_VERIFICATION,
  TIME_EXPIRE_SESSION,
  TIME_THROTTLE,
} from "../../config/constants"
import { sendEmail } from "../../lib/email"
import * as sessionService from "./session.service"
import * as tokenService from "./token.service"
import * as cookieService from "./cookie.service"
import { Context } from "hono"
import { getDeviceInfo } from "../../utils/helper"
import { BillingCycle, SubscriptionPlan, SubscriptionStatus } from "../../db/enum"
import { AppException } from "../../utils/error-handle"
import { EmailTemplate } from "../../lib/email-templates"

// Helpers
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 10
  return bcrypt.hash(password, saltRounds)
}

// services
export const login = async (c: Context<App>, input: LoginSchemaInput) => {
  const db = c.get("db")
  const user = await db.query.users.findFirst({ where: eq(users.email, input.email.toLowerCase()) })
  if (!user) {
    throw new HTTPException(401, { message: "Email o contraseña incorrectos" })
  }

  if (!user.password) {
    throw new HTTPException(401, { message: "Intenta iniciar sesión con Google o restablece tu contraseña." })
  }
  const isPasswordValid = await bcrypt.compare(input.password, user.password)
  if (!isPasswordValid) {
    throw new HTTPException(401, { message: "Email o contraseña incorrectos" })
  }

  if (!user.emailVerified) {
    throw new HTTPException(403, { message: "Debes verificar tu correo para continuar." })
  }

  await db.update(users).set({ lastLogin: new Date() }).where(eq(users.id, user.id))

  const ua = c.req.header("User-Agent")
  const device = getDeviceInfo(ua ?? "")

  const sessionToken = sessionService.generateSessionToken()
  const session = await sessionService.createSession(db, sessionToken, user.id, device)

  const token = await sign(
    {
      sub: user.id,
      sessionToken,
      exp: Date.now() + TIME_EXPIRE_SESSION,
    },
    c.env.SECRET_KEY
  )

  if (session) {
    c.header("Set-Cookie", cookieService.createSessionCookie(sessionToken), {
      append: true,
    })
  }

  return {
    user: { name: user.name, email: user.email },
    token,
  }
}

export const register = async (db: DB, input: RegisterSchemaInput, envs: Env) => {
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, input.email.toLowerCase()),
  })
  if (existingUser) {
    if (!existingUser.emailVerified) {
      throw new AppException(409, {
        message:
          "Ya tienes una cuenta pendiente de activación. Revisa tu email para activarla. Puedes intentar reenviar el email de verificación.",
        code: "EMAIL_NOT_VERIFIED",
      })
    }

    throw new HTTPException(409, { message: "El correo ya está registrado." })
  }

  const hashedPassword = await hashPassword(input.password)
  const [newUser] = await db
    .insert(users)
    .values({
      ...input,
      email: input.email.toLowerCase(),
      password: hashedPassword,
      emailVerified: false,
    })
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      createdAt: users.createdAt,
    })

  if (!newUser) {
    throw new HTTPException(500, { message: "Error interno del servidor" })
  }

  await db.insert(subscriptions).values({
    userId: newUser.id,
    gatewayCustomerId: "",
    gatewaySubscriptionId: "",
    gatewayPriceId: "",
    gatewayCurrentPeriodEnd: "",
    subscribedAt: new Date().toISOString(),
    hadTrial: false,
    trialEndsAt: null,
    // trialEndsAt: selectedPlan === SubscriptionPlan.pro ? new Date(Date.now() + TRIAL_PERIOD) : null,
    plan: SubscriptionPlan.FREE,
    // plan: selectedPlan === SubscriptionPlan.pro ? SubscriptionPlan.pro : SubscriptionPlan.free,
    status: SubscriptionStatus.ACTIVE,
    billingCycle: BillingCycle.MONTHLY, // o lo que decidas
    canceledAt: null,
    nextBillingDate: null, // o lo calculas aquí
  })

  const verificationCode = await tokenService.generateCodeInDB(
    db,
    newUser.id,
    newUser.email,
    TypeUseToken.VERIFY_EMAIL,
    EXPIRE_TIME_VERIFICATION
  )

  const verifyLink = `${envs.FRONTEND_URL}/verify-email?code=${verificationCode}`
  await sendEmail({
    to: newUser.email,
    subject: "Verifica tu correo electrónico",
    template: EmailTemplate.VERIFY_EMAIL,
    vars: {
      name: newUser.name ?? "Usuario",
      verificationLink: verifyLink,
    },
    envs,
  })
  return newUser
}

export const verifyEmail = async (db: DB, code: string) => {
  const { userId, isValid } = await tokenService.verifyCode(db, { code, typeUse: TypeUseToken.VERIFY_EMAIL })
  if (!userId || !isValid) {
    throw new HTTPException(400, { message: "Codigo inválido o expirado." })
  }

  const userVerified = await db
    .update(users)
    .set({
      emailVerified: true,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(users.id, userId))
    .returning({
      name: users.name,
      email: users.email,
    })

  if (userVerified.length === 0) {
    throw new HTTPException(400, {
      message: "Error al actualizar el usuario.",
    })
  }

  return userVerified[0]
}

export const resendVerification = async (db: DB, email: string, envs: Env) => {
  const user = await db.query.users.findFirst({ where: eq(users.email, email.toLowerCase()) })
  if (!user) {
    throw new HTTPException(404, { message: "Usuario no encontrado." })
  }
  if (user.emailVerified) {
    throw new HTTPException(400, { message: "El usuario ya está verificado." })
  }

  const lastCode = await db.query.usersTokens.findFirst({
    where: and(eq(usersTokens.userId, user.id), eq(usersTokens.typeUse, TypeUseToken.VERIFY_EMAIL)),
    orderBy: (usersTokens, { desc }) => [desc(usersTokens.createdAt)],
  })

  if (lastCode?.expiresAt) {
    // Calculate when the token was generated
    const tokenGenerationTime = new Date(lastCode.expiresAt).getTime() - EXPIRE_TIME_VERIFICATION
    const timeElapsed = Date.now() - tokenGenerationTime

    // Check if the token has expired
    // TODO: add ratelimit some routes, use @hono-rate-limiter/cloudflare (to save in Workers Rate Limiting API) and hono-rate-limiter
    // https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
    if (timeElapsed < TIME_THROTTLE) {
      const remainingTime = TIME_THROTTLE - timeElapsed
      const remainingMinutes = Math.floor(remainingTime / 60000)
      const remainingSeconds = Math.floor((remainingTime % 60000) / 1000)
      throw new HTTPException(429, {
        message: `Espera unos ${remainingMinutes}m ${remainingSeconds}s antes de solicitar otro email.`,
      })
    }
  }

  const verificationCode = await tokenService.generateCodeInDB(
    db,
    user.id,
    user.email,
    TypeUseToken.VERIFY_EMAIL,
    EXPIRE_TIME_VERIFICATION
  )

  const verifyLink = `${envs.FRONTEND_URL}/verify-email?code=${verificationCode}`

  await sendEmail({
    to: email,
    subject: "Verifica tu correo electrónico",
    template: EmailTemplate.VERIFY_EMAIL,
    vars: {
      name: user.name ?? "Usuario",
      verificationLink: verifyLink,
    },
    envs: envs,
  })

  return { status: true }
}

export const forgotPassword = async (db: DB, email: string, envs: Env) => {
  const user = await db.query.users.findFirst({ where: eq(users.email, email.toLowerCase()) })
  if (!user) {
    throw new HTTPException(404, { message: "Usuario no encontrado." })
  }

  if (!user.emailVerified) {
    throw new HTTPException(403, {
      message: "Estas intentando restablecer tu contraseña sin haber verificado tu correo.",
    })
  }

  // search by exsiting codes
  const existingCode = await db.query.usersTokens.findFirst({
    where: and(eq(usersTokens.userId, user.id), eq(usersTokens.typeUse, TypeUseToken.RESET_PASSWORD)),
    orderBy: (usersTokens, { desc }) => [desc(usersTokens.createdAt)],
  })

  if (existingCode?.expiresAt) {
    // Calculate when the token was generated
    const tokenGenerationTime = new Date(existingCode.expiresAt).getTime() - EXPIRE_TIME_VERIFICATION
    const timeElapsed = Date.now() - tokenGenerationTime

    // Check if the token has expired
    // TODO: add ratelimit some routes, use @hono-rate-limiter/cloudflare (to save in Workers Rate Limiting API) and hono-rate-limiter
    // https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/

    if (timeElapsed < TIME_THROTTLE) {
      const remainingTime = TIME_THROTTLE - timeElapsed
      const remainingMinutes = Math.floor(remainingTime / 60000)
      const remainingSeconds = Math.floor((remainingTime % 60000) / 1000)
      throw new HTTPException(429, {
        message: `Espera unos ${remainingMinutes}m ${remainingSeconds}s antes de solicitar otro solicitud.`,
      })
    }
  }

  const resetCode = await tokenService.generateCodeInDB(
    db,
    user.id,
    user.email,
    TypeUseToken.RESET_PASSWORD,
    EXPIRE_TIME_RESET_PASSWORD
  )
  const resetLink = `${envs.FRONTEND_URL}/reset-password?code=${resetCode}`

  await sendEmail({
    to: user.email,
    subject: "Recupera tu contraseña",
    template: EmailTemplate.RESET_PASSWORD,
    vars: {
      name: user.name ?? "Usuario",
      resetLink: resetLink,
    },
    envs,
  })

  return { status: true }
}

export const resetPassword = async (db: DB, input: ResetPasswordSchemaInput, code: string) => {
  const user = await db.query.users.findFirst({
    where: eq(users.email, input.email),
  })
  if (!user) {
    throw new HTTPException(400, { message: "User no exists." })
  }

  const { userId, isValid } = await tokenService.verifyCode(db, {
    email: input.email,
    code: code,
    typeUse: TypeUseToken.RESET_PASSWORD,
  })
  if (!userId || !isValid) {
    throw new HTTPException(400, { message: "Codigo inválido o expirado." })
  }

  const hashedPassword = await hashPassword(input.newPassword)
  await db
    .update(users)
    .set({
      password: hashedPassword,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(users.id, user.id))

  await sessionService.invalidateAllSessions(db, user.id)

  return { status: true }
}
