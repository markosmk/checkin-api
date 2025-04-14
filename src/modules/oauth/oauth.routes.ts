import { Hono } from "hono"
import { googleAuth } from "@hono/oauth-providers/google"
import { getCookie } from "hono/cookie"
import { zValidator } from "@hono/zod-validator"
import type { App } from "../../types"
import * as googleService from "./google.service"
import * as oauthService from "./oauth.service"
import { NAME_COOKIE_SESSION } from "../../config/constants"
import { z } from "zod"

const app = new Hono<App>()

// redireccionamiento autorizados
// http://localhost:8787/api/v1/oauth/google
app.get(
  "/google",
  async (c, next) => {
    const authMiddleware = googleAuth({
      client_id: c.env.GOOGLE_ID,
      client_secret: c.env.GOOGLE_SECRET,
      scope: ["openid", "email", "profile"],
    })
    return authMiddleware(c, next)
  },
  async (c) => {
    const userGoogle = c.get("user-google")
    const sessionToken = getCookie(c, NAME_COOKIE_SESSION)

    if (!userGoogle) {
      return c.json({ message: "No se pudo vincular la cuenta de Google" }, 400)
    }

    const data = await googleService.createGoogleSession({
      c,
      userGoogle,
      sessionToken,
    })
    if (!data) {
      return c.json({ message: "No se pudo vincular la cuenta de Google" }, 400)
    }

    return c.json(data, 200)
  }
)

// FIX: Make tests, add zod validation newPassword and syncronize with front shcmea
app.post("/set-password", zValidator("json", z.object({ newPassword: z.string() })), async (c) => {
  const userId = c.get("user").id
  const { newPassword } = c.req.valid("json")
  await oauthService.setPassword(c.get("db"), userId, newPassword)
  return c.json({ success: true })
})

export default app
