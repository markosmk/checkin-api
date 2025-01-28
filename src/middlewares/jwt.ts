import type { Context, Next } from "hono"
import { jwt } from "hono/jwt"

export const jwtMiddleware = async (c: Context, next: Next) => {
  try {
    const jwtHandler = jwt({ secret: c.env.SECRET_KEY })
    return await jwtHandler(c, next)
  } catch (err) {
    return c.json(
      {
        success: false,
        message: "Unauthorized",
        error: (err as Error).message,
      },
      401
    )
  }
}
