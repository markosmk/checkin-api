import { Hono } from "hono"

import auth from "./routes/auth"
import user from "./routes/user"
import hotel from "./routes/hotel"
import { HTTPException } from "hono/http-exception"

const app = new Hono()

app.route("/auth", auth)
app.route("/user", user)
app.route("/hotel", hotel)

app.get("/", (c) => {
  return c.text("¡Bienvenido!")
})
app.notFound((c) => {
  return c.json({ message: "Not Found" }, 404)
})

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse()
  }
  console.error("Unhandled Error:", err)
  return c.json({ message: "Internal Server Error" }, 500)
})

export default app
