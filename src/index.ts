import { Hono } from "hono"
import { cors } from "hono/cors"
// import { csrf } from "hono/csrf"

// routes
import auth from "./modules/auth/auth.routes"
import users from "./modules/users/users.routes"
import me from "./modules/me/me.routes"
import hotels from "./modules/hotels/hotels.routes"
import publicHotel from "./modules/hotels/hotels.public.routes"
import booking from "./modules/bookings/bookings.routes"
import sessions from "./modules/sessions/sessions.routes"
import oauth from "./modules/oauth/oauth.routes"
import subscriptionsRouter from "./modules/subscriptions/subscriptions.routes"
// import mpRouter from "./modules/webhooks/mp.routes"
import publicPax from "./modules/paxs/paxs.public.routes"
import publicBooking from "./modules/bookings/bookings.public.routes"
import paxs from "./modules/paxs/paxs.routes"
// middlewares
import { dbMiddleware } from "./middlewares/db.middleware"
import { sessionMiddleware } from "./middlewares/session.midleware"
import { errorHandle } from "./utils/error-handle"
import { publicMiddleware } from "./middlewares/public.middleware"
// import { timeoutMiddleware } from "./middlewares/timeout.middleware"
import type { App } from "./types"

const app = new Hono<App>()
// see https://hono.dev/middleware/builtin/csrf for more options
// app.use(csrf())
app.use("/api/v1/public/*", (c, next) => {
  const handler = cors({ origin: c.env.FRONTEND_URL })
  return handler(c, next)
})
// applying a 15-second timeout
// app.use("/api", timeoutMiddleware(15000))

app.use("/api/v1/*", dbMiddleware)

// ---
// Public routes
// ---
app.route("/api/checkin", publicHotel)
app.use("/api/checkin/:slug/:bookingId/*", publicMiddleware)
app.route("/api/checkin/:slug/:bookingId", publicBooking)
app.route("/api/checkin/:slug/:bookingId/paxs", publicPax)

// ---
// Protected routes (except auth)
// ---
app.use("/api/v1/*", sessionMiddleware)
app.route("/api/v1/auth", auth)
app.route("/api/v1/oauth", oauth)
app.route("/api/v1/me", me)
// app.route("/api/webhooks", mpRouter)
app.route("/api/v1/subscriptions", subscriptionsRouter)
app.route("/api/v1/user", users)
app.route("/api/v1/sessions", sessions)
app.route("/api/v1/hotels", hotels)
app.route("/api/v1/bookings", booking)
app.route("/api/v1/paxs", paxs)

app.get("/", (c) => c.text("¡Bienvenido!"))
app.notFound((c) => c.json({ message: "Pagina no encontrada." }, 404))
app.onError(errorHandle)

export default app
