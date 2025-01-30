import { Hono } from "hono"
import { HTTPException } from "hono/http-exception"

import auth from "./routes/auth"
import authExtended from "./routes/auth-extended"
import user from "./routes/user"
import hotel from "./routes/hotel"
import publicHotel from "./routes/hotel.public"
import booking from "./routes/booking"
import publicBooking from "./routes/booking.public"
import pax from "./routes/pax"
import publicPax from "./routes/pax.public"

const app = new Hono()

app.route("/auth", auth)
app.route("/auth", authExtended)
app.route("/user", user)
app.route("/hotels", hotel)
app.route("/bookings", booking)
app.route("/paxs", pax)

app.route("/public/hotels", publicHotel)
app.route("/public/bookings", publicBooking)
app.route("/public/paxs", publicPax)

app.get("/", (c) => {
  return c.text("¡Bienvenido!")
})
app.notFound((c) => {
  return c.json({ message: "Not Found" }, 404)
})

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    // return err.getResponse()
    return c.json({ message: err.message || err.getResponse() }, err.status)
  }
  console.error("Unhandled Error:", err)
  return c.json({ message: "Internal Server Error" }, 500)
})

export default app
