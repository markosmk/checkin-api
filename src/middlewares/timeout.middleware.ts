import { Context } from "hono"
import { timeout } from "hono/timeout"
import { HTTPException } from "hono/http-exception"

export const timeoutMiddleware = (timeoutMs: number) => {
  return timeout(timeoutMs, (c: Context) => {
    const duration = c.req.header("Duration") || (timeoutMs / 1000).toString()
    return new HTTPException(408, {
      message: `Request timeout after waiting ${duration} seconds. Please try again later.`,
    })
  })
}
