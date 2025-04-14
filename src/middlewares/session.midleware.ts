import type { Context, Next } from "hono"
import { getCookie } from "hono/cookie"
import { NAME_COOKIE_SESSION } from "../config/constants"
import * as sessionService from "../modules/auth/session.service"
import * as cookieService from "../modules/auth/cookie.service"
import { env } from "hono/adapter"
import { verifyRequestOrigin } from "../utils/helper"
import type { App } from "../types"

export const sessionMiddleware = async (c: Context<App>, next: Next) => {
  // exclude auth routes
  if (c.req.path.includes("/auth")) {
    return next()
  }

  const originHeader = c.req.header("Origin") ?? c.req.header("origin")
  const hostHeader = c.req.header("Host") ?? c.req.header("X-Forwarded-Host")
  // this is because of cloudflare workers, we need to allow cross origin requests for public routes
  if (
    (!originHeader || !hostHeader || !verifyRequestOrigin(originHeader, [hostHeader, env(c).FRONTEND_URL])) &&
    env(c).ENVIRONMENT === "production" &&
    c.req.method !== "GET"
  ) {
    return new Response(null, {
      status: 403,
    })
  }

  // 1) get session id (token)
  let token = getCookie(c, NAME_COOKIE_SESSION) ?? null

  if (!token) {
    const authorizationHeader = c.req.header("Authorization")
    token = await sessionService.resolveBearerToken(authorizationHeader ?? "", c.env.SECRET_KEY)
  }

  if (!token) {
    return c.json({ message: "Unauthorized" }, 401)
  }

  // 2) validate session
  const { session, user } = await sessionService.validateSessionToken(c.get("db"), token)

  if (!session || !user || session === null) {
    c.header(
      "Set-Cookie",
      cookieService.createBlankSessionCookie({
        secure: c.env.ENVIRONMENT !== "development",
      }),
      {
        append: true,
      }
    )
    return c.json({ message: "Unauthorized" }, 401)
  }

  // 3) keep the session alive, extends the expiration date
  if (session?.fresh) {
    c.header(
      "Set-Cookie",
      cookieService.createSessionCookie(token, {
        secure: env(c).ENVIRONMENT !== "development",
      }),
      {
        append: true,
      }
    )
  }

  // 4) set the user and session in the context
  c.set("user", user)
  c.set("session", session)

  // await next();
  return next()
}
