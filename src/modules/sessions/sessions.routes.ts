import { Hono } from "hono"
import { App } from "../../types"
import { sessions } from "../../db/schema"
import { and, eq } from "drizzle-orm"

const app = new Hono<App>()

app.get("/", async (c) => {
  const userId = c.get("user").id
  const userSessions = await c.get("db").select().from(sessions).where(eq(sessions.userId, userId))
  return c.json(userSessions)
})

app.delete("/:id/revoke", async (c) => {
  const userId = c.get("user").id
  const sessionId = c.req.param("id")
  const deleted = await c
    .get("db")
    .delete(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)))
  // console.log("deleted", deleted)
  if (deleted.meta.changes === 0) return c.json({ message: "No hay cambios realizados." }, 404)
  return c.json({ message: "Sesion revocada" })
})

export default app
