import type { Context, Next } from "hono"
import { HTTPException } from "hono/http-exception"

import prismaClients from "../lib/prisma"
import { PLANS } from "../config/plans"
import { SubscriptionPlan, SubscriptionStatus } from "@prisma/client"

const PROTECTED_ROUTES = [
  { path: "hotels", methods: ["POST", "PUT"] },
  { path: "bookings", methods: ["POST", "PUT"] },
  { path: "paxs", methods: ["POST"] }, // TODO: check if too in public endpoint or nor, docment all
]

const PROTECTED_BY_EMAIL_VERIFICATION = ["hotels", "bookings", "paxs"]

export const planMiddleware = async (c: Context, next: Next) => {
  const userId = c.get("jwtPayload")?.userId
  if (!userId) throw new HTTPException(401, { message: "No estás autenticado." })

  const { path, method } = c.req
  // console.log({ path, method })

  const needsCheck = PROTECTED_ROUTES.some((route) => path.includes(route.path) && route.methods.includes(method))
  if (!needsCheck || !PROTECTED_BY_EMAIL_VERIFICATION.includes(path)) {
    console.log("Ruta no protegida.")
    return next()
  }

  const prisma = await prismaClients.fetch(c.env.DATABASE_URL)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: true },
  })
  if (!user || !user.subscription) {
    throw new HTTPException(401, { message: "Usuario no encontrado." })
  }

  if (PROTECTED_BY_EMAIL_VERIFICATION.includes(path) && !user?.emailVerified) {
    throw new HTTPException(403, { message: "Debes verificar tu correo para continuar." })
  }

  const sub = user.subscription
  const plan = sub?.plan || "free"
  const limits = PLANS[plan]
  const now = new Date()

  // 1) Limitar cantidad de hoteles
  if (path.startsWith("/hotels") && method === "POST") {
    const hotelCount = await prisma.hotel.count({ where: { userId } })
    if (hotelCount >= limits.maxHotels) {
      throw new HTTPException(403, { message: `Has alcanzado el límite de hoteles en tu plan.` })
    }
  }

  // 2) Validar si puede usar campos personalizados, al crear o actualizar hotel
  if (path.startsWith("/hotels") && (method === "POST" || method === "PUT")) {
    const data = await c.req.json()
    if (!limits.allowCustomFields && data.fieldsAllowed) {
      throw new HTTPException(403, { message: "Tu plan no permite personalizar campos." })
    }
  }

  // 3) Limites al crear una nueva reserva (bussines permitido, sin limites)
  if (path.startsWith("/bookings") && method === "POST" && plan !== SubscriptionPlan.business) {
    // if (plan === "business") return await next()

    // const bookingCount = await prisma.booking.count({ where: { userId } })
    const activeBookings = await prisma.booking.count({
      where: { userId, status: { notIn: ["cancelled"] } },
    })

    // 3.1) Validar cantidad de reservas activas (bussines permitido)
    if (activeBookings >= limits.maxActiveBookings) {
      throw new HTTPException(403, { message: `Tu plan solo permite ${limits.maxActiveBookings} reservas activas.` })
    }
  }

  // 3.2) Validar cantidad de huéspedes por reserva (bussines permitido)
  if (path.startsWith("/bookings") && (method === "POST" || method === "PUT")) {
    const data = await c.req.json()
    if (data.maxPaxs > limits.maxPaxPerBooking) {
      throw new HTTPException(403, {
        message: `Tu plan solo permite ${limits.maxPaxPerBooking} huéspedes por reserva.`,
      })
    }
  }

  // 4) Validar si puede subir archivos
  if (path.startsWith("/bookings") && (method === "POST" || method === "PUT")) {
    const data = await c.req.json()
    if (!limits.allowFileUploads && data.files) {
      throw new HTTPException(403, { message: "Tu plan no permite subir archivos." })
    }
  }

  // 5) Verificar si el Trial terminó
  // si termino se pasa a free
  const isTrialEnded = sub.trialEndsAt && now > sub.trialEndsAt
  if (isTrialEnded) {
    await prisma.subscription.update({
      where: { userId },
      data: {
        plan: SubscriptionPlan.free,
        status: SubscriptionStatus.paused,
        trialEndsAt: null,
        hadTrial: true,
      },
    })
    throw new HTTPException(403, { message: "Tu periodo de prueba ha finalizado. Tu cuenta ha pasado a Free." })
  }

  // 6) Verificar si el plan pago venció
  const isSuscriptionEnded = sub.gatewayCurrentPeriodEnd && now > sub.gatewayCurrentPeriodEnd
  if (isSuscriptionEnded) {
    await prisma.subscription.update({
      where: { userId },
      data: { plan: SubscriptionPlan.free, status: SubscriptionStatus.paused, trialEndsAt: null },
    })
    throw new HTTPException(403, { message: "Tu suscripción ha expirado. Se ha cambiado al plan Free." })
  }

  await next()
}
