import { Context, Next } from "hono"
import { getCookie } from "hono/cookie"
import { NAME_COOKIE_SESSION } from "../config/constants"
import * as sessionService from "../modules/auth/session.service"
import * as cookieService from "../modules/auth/cookie.service"

export const sessionMiddleware = async (c: Context, next: Next) => {
  let token = getCookie(c, NAME_COOKIE_SESSION) ?? null

  if (!token) {
    const authorizationHeader = c.req.header("Authorization")
    token = await sessionService.resolveBearerToken(authorizationHeader ?? "", c.env.SECRET_KEY)
  }

  if (!token) {
    return c.json({ message: "Unauthorized" }, 401)
  }
  const { session, user } = await sessionService.validateSessionToken(c.get("db"), token)

  if (!session || !user || session === null) {
    c.header("Set-Cookie", cookieService.createBlankSessionCookie(), {
      append: true,
    })
    return c.json({ message: "Unauthorized" }, 401)
  }

  // keep the session alive, extends the expiration date
  if (session.fresh) {
    c.header("Set-Cookie", cookieService.createSessionCookie(token), {
      append: true,
    })
  }

  c.set("user", user)
  c.set("session", session)
  return next()
}
