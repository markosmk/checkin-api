import type { MiddlewareHandler } from "hono"
import { MercadoPagoConfig } from "mercadopago"
import type { App } from "../types"

export const withMercadoPago: MiddlewareHandler<App> = async (c, next) => {
  const mp = new MercadoPagoConfig({
    accessToken: c.env.MP_ACCESS_TOKEN,
  })

  c.set("mercadopago", mp)
  await next()
}
