import { Hono } from "hono"

import type { App } from "../../types"
import * as userService from "./users.service"
import { HTTPException } from "hono/http-exception"
import { CreateUserSchema, UpdateUserSchema } from "./users.schema"
import { zValidator } from "@hono/zod-validator"

const user = new Hono<App>()

// TODO: checking role admin only testing this routes
user.get("/", async (c) => {
  const db = c.get("db")
  const result = await userService.getAllUsers(db)
  return c.json({ result })
})

user.post("/", zValidator("json", CreateUserSchema), async (c) => {
  const db = c.get("db")
  const data = c.req.valid("json")
  const result = await userService.createUser(db, data)
  return c.json(result)
})

user.get("/profile", async (c) => {
  const userId = c.get("session").userId
  const db = c.get("db")
  const result = await userService.getUserById(db, userId)
  if (!result) {
    throw new HTTPException(404, { message: "Usuario no encontrado" })
  }
  return c.json(result)
})

user.put("/profile", zValidator("json", UpdateUserSchema), async (c) => {
  const userId = c.get("session").userId
  const db = c.get("db")
  const data = c.req.valid("json")
  const respond = await userService.updateUser(db, userId, data)
  return c.json({ message: "Usuario actualizado", user: respond })
})

export default user
