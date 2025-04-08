import type { Context, Next } from "hono"
import type { App } from "../types"
import { createFactory } from "hono/factory"
import { jwt } from "hono/jwt"

const factory = createFactory<App>()

/** @deprecated in favor to sessionMiddleware, session is saved in db */
export const jwtMiddleware = factory.createMiddleware(async (c: Context, next: Next) => {
  const authHeader = c.req.header("Authorization")
  if (!authHeader) {
    return c.json(
      {
        success: false,
        message: "Unauthorized",
        error: "Missing Authorization header. Please provide a Bearer token",
      },
      401
    )
  }

  const jwtHandler = jwt({
    secret: c.env.SECRET_KEY,
  })

  return jwtHandler(c, next).catch((err) => {
    const errorMessage = (err as Error).message
    return c.json(
      {
        success: false,
        message: "Unauthorized",
        error: errorMessage.includes("jwt") ? "Invalid or expired token" : errorMessage,
      },
      401
    )
  })
})
