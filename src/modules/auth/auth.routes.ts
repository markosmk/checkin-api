import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import type { App } from "../../types"
import { emailSchema, loginSchema, registerSchema, resetPasswordSchema } from "./auth.schema"
import * as authService from "./auth.service"
import * as cookieService from "./cookie.service"
import * as sessionService from "./session.service"
import { z } from "zod"
import { getCookie } from "hono/cookie"
import { NAME_COOKIE_SESSION } from "../../config/constants"
import { env } from "hono/adapter"

const auth = new Hono<App>()

auth.post("/register", zValidator("json", registerSchema), async (c) => {
  const validatedData = c.req.valid("json")
  const response = await authService.register(c.get("db"), validatedData, c.env)
  return c.json({ message: "Registro exitoso. Revisa tu email para activarlo.", user: response }, 201)
})

auth.post("/login", zValidator("json", loginSchema), async (c) => {
  const validatedData = c.req.valid("json")
  const response = await authService.login(c, validatedData)
  return c.json({ message: "Inicio de sesión exitoso", ...response })
})

auth.post("/logout", async (c) => {
  let token = getCookie(c, NAME_COOKIE_SESSION) ?? null

  if (!token) {
    const authorizationHeader = c.req.header("Authorization")
    token = await sessionService.resolveBearerToken(authorizationHeader ?? "", c.env.SECRET_KEY)
  }

  if (!token) {
    return c.json({ message: "No hay una session activa" }, 400)
  }
  await sessionService.invalidateSession(c.get("db"), token)
  c.header("Set-Cookie", cookieService.createBlankSessionCookie({ secure: env(c).ENVIRONMENT !== "development" }), {
    append: true,
  })
  return c.json(null, 200)
})

auth.get("/verify-email", zValidator("query", z.object({ code: z.string() })), async (c) => {
  const { code } = c.req.valid("query")
  const response = await authService.verifyEmail(c.get("db"), code)
  return c.json({ message: "Correo verificado. Ahora puedes acceder al panel.", user: response })
})

auth.post("/resend-verification", zValidator("json", emailSchema), async (c) => {
  const { email } = c.req.valid("json")
  await authService.resendVerification(c.get("db"), email, c.env)
  return c.json({ message: "Se ha enviado un nuevo correo de verificación." })
})

auth.post("/forgot-password", zValidator("json", emailSchema), async (c) => {
  const { email } = c.req.valid("json")
  await authService.forgotPassword(c.get("db"), email, c.env)
  return c.json({ message: "Email enviado con instrucciones para restablecer tu contraseña." })
})

auth.post(
  "/reset-password",
  zValidator("query", z.object({ code: z.string() })),
  zValidator("json", resetPasswordSchema),
  async (c) => {
    const validatedData = c.req.valid("json")
    const { code } = c.req.valid("query")
    await authService.resetPassword(c.get("db"), validatedData, code)
    return c.json({ message: "Contraseña actualizada correctamente." })
  }
)

export default auth
