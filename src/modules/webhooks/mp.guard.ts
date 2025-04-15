import type { MiddlewareHandler } from "hono"
import type { App } from "../../types"
import crypto from "node:crypto"

export const validateOriginMiddleware: MiddlewareHandler<App> = async (c, next) => {
  // Obtain the x-signature value from the header
  const xSignature = c.req.header("x-signature")
  const xRequestId = c.req.header("x-request-id")

  // Validate required headers
  if (!xSignature || !xRequestId) {
    return c.json({ error: "Missing required headers" }, 400)
  }

  // Obtain Query params related to the request URL
  const dataID = c.req.query("data.id")
  if (!dataID) {
    return c.json({ error: "Missing data.id parameter" }, 400)
  }

  // Parse x-signature header
  const signatureParams = new Map(
    xSignature.split(",").map((part) => {
      const [key, value] = part.split("=").map((s) => s.trim())
      return [key, value]
    })
  )

  const ts = signatureParams.get("ts")
  const hash = signatureParams.get("v1")
  if (!ts || !hash) {
    return c.json({ error: "Invalid signature format" }, 400)
  }

  // Validate timestamp to prevent replay attacks | delayed notifications
  const timestampAge = Date.now() - Number.parseInt(ts)
  const MAX_TIMESTAMP_AGE = 5 * 60 * 1000 // 5 minutes
  if (timestampAge > MAX_TIMESTAMP_AGE) {
    return c.json(
      {
        error: "Signature timestamp expired",
        message: "El tiempo de la firma ha expirado. Por favor, intente nuevamente con una solicitud actualizada.",
      },
      403
    )
  }

  // Obtain the secret key for the user/application from Mercadopago developers site
  const secret = c.env.MP_SECRET_KEY_WEBHOOK
  if (!secret) {
    throw new Error("MP_SECRET_KEY_WEBHOOK environment variable is not set")
  }

  // Generate the manifest string
  const manifest = `id:${dataID};request-id:${xRequestId};ts:${ts};`

  // Create and verify HMAC signature
  const hmac = crypto.createHmac("sha256", secret)
  hmac.update(manifest)
  const calculatedHash = hmac.digest("hex")
  if (calculatedHash !== hash) {
    return c.json(
      {
        error: "Invalid signature",
        message: "HMAC verification failed",
      },
      403
    )
  }

  await next()
}
