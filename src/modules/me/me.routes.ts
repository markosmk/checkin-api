import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { and, eq } from "drizzle-orm"
import { env } from "hono/adapter"
import { z } from "zod"

import type { App } from "../../types"
import * as userService from "../users/users.service"
import { oauthAccounts, users } from "../../db/schema"
import * as cookiesService from "../auth/cookie.service"
import { UpdateUserSchema } from "../users/users.schema"

const user = new Hono<App>()

user.get("/", async (c) => {
  const userId = c.get("session").userId
  const db = c.get("db")
  const result = await userService.getUserById(db, userId)
  return c.json(result)
})

user.put("/", zValidator("json", UpdateUserSchema), async (c) => {
  const userId = c.get("session").userId
  const db = c.get("db")
  const data = c.req.valid("json")
  const respond = await userService.updateUser(db, userId, data)
  return c.json({ message: "Usuario actualizado", user: respond })
})

user.get("/oauth-accounts", async (c) => {
  const oauthAccounts = await c.get("db").query.oauthAccounts.findMany({
    where: (u, { eq }) => eq(u.userId, c.get("user")?.id ?? ""),
  })
  return c.json({
    accounts: oauthAccounts.map((oauth) => ({
      provider: oauth.provider,
    })),
  })
})

user.delete("/oauth/:provider", zValidator("param", z.object({ provider: z.literal("google") })), async (c) => {
  const provider = c.req.param("provider")
  const userId = c.get("user")?.id
  const db = c.get("db")

  const oauthAccount = await db.query.oauthAccounts.findFirst({
    where: and(eq(oauthAccounts.userId, userId), eq(oauthAccounts.provider, provider)),
  })

  if (!oauthAccount) {
    return c.json({ error: "Cuenta no encontrada" }, 404)
  }

  // verify if user has password, to ensure that user can access to plataform
  const hasPassword = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { password: true },
  })

  if (!hasPassword) {
    return c.json(
      {
        error: "No puedes desvincular tu única forma de acceso. Establece una contraseña primero.",
      },
      400
    )
  }

  // delete account OAuth (transacción para atomicidad)
  await db.transaction(async (tx) => {
    await tx.delete(oauthAccounts).where(and(eq(oauthAccounts.userId, userId), eq(oauthAccounts.provider, provider)))
  })

  return c.json({ success: true })
})

user.delete("/user", async (c) => {
  const user = c.get("user")
  const db = c.get("db")

  // delete related data
  await db.delete(oauthAccounts).where(eq(oauthAccounts.userId, user.id))
  await db.delete(users).where(eq(users.id, user.id))

  // close session
  c.header(
    "Set-Cookie",
    cookiesService.createBlankSessionCookie({
      secure: env(c).ENVIRONMENT !== "development",
    })
  )

  return c.json({ success: true })
})

export default user
