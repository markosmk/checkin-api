import { Payment, PreApproval, type MercadoPagoConfig } from "mercadopago"
import { BillingCycle, PaymentStatus, type SubscriptionPlan, SubscriptionStatus } from "../../db/enum"
import type { PaymentStatusMp } from "./mp.types"

export async function subscribe(
  mpClient: MercadoPagoConfig,
  envs: Env,
  userId: string,
  emailUser: string,
  plan: {
    type: SubscriptionPlan
    billingCycle: BillingCycle
    price: number
  }
): Promise<{ externalReference: string; urlCheckout: string; id: string; nextPaymentDate: string; payerId: string }> {
  // https://www.mercadopago.com.ar/developers/es/reference/subscriptions/_preapproval/post
  const subscription = await new PreApproval(mpClient).create({
    body: {
      back_url: envs.FRONTEND_URL, // TODO: define section in admin for suscripciones ex: /admin/suscripciones
      reason: `Suscripción a ${plan.type} - Plan ${plan.billingCycle === BillingCycle.YEARLY ? "Anual" : "Mensual"} - ${
        envs.PLATFORM_NAME
      }`,
      auto_recurring: {
        frequency: plan.billingCycle === BillingCycle.YEARLY ? 12 : 1, // or 12 for yearly
        frequency_type: "months", // 'days' | 'months'
        // start_date: new Date().toISOString(),
        // end_date: new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 30).toISOString(),
        transaction_amount: plan.price,
        currency_id: "ARS",
      },
      external_reference: userId, // `${userId}:${hotelId}` if hotel by susbscriptions
      payer_email: emailUser,
      status: "pending", // without pay associated 'authorized' | 'pending'
    },
  })

  if (!subscription || !subscription.init_point)
    throw new Error("Sucedio un error al crear la suscripción. Intentalo de nuevo más tarde.")

  return {
    id: subscription.id ?? "",
    externalReference: subscription.external_reference ?? "",
    urlCheckout: subscription.init_point,
    nextPaymentDate: subscription.next_payment_date ?? "",
    payerId: subscription.payer_id?.toString() ?? "",
  }
}

export async function getInfoSubscription(mpClient: MercadoPagoConfig, subscriptionId: string) {
  // https://www.mercadopago.com.ar/developers/en/reference/subscriptions/_preapproval_id/get
  // const mpSub = await fetch(`https://api.mercadopago.com/preapproval/${subscriptionId}`, {
  //   method: "GET",
  //   headers: { "Content-Type": "application/json", Authorization: `Bearer ${envs.MP_ACCESS_TOKEN}` },
  // }).then((r) =>
  //   r.json()
  // )
  const mpSub = await new PreApproval(mpClient).get({ id: subscriptionId })
  console.log("mpSub", mpSub)
  if (!mpSub?.status) throw new Error("No id")

  return {
    id: mpSub.id,
    status: mapMPStatusToLocal(mpSub.status),
    gatewayNextPaymentDate: mpSub.next_payment_date,
  }
}

export async function getInfoPayment(mpClient: MercadoPagoConfig, paymentId: string) {
  // const mpPayment = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
  //   headers: { Authorization: `Bearer ${envs.MP_ACCESS_TOKEN}` },
  // }).then((r) => r.json())

  const mpPayment = await new Payment(mpClient).get({ id: paymentId })
  // TODO: map response
  return { ...mpPayment, status: mpPayment.status as PaymentStatusMp }
}

export async function cancelSubscription(mpClient: MercadoPagoConfig, subscriptionId: string, userId: string) {
  const mpSub = await new PreApproval(mpClient).update({
    id: subscriptionId,
    body: {
      reason: "Cancelacion de Suscripcion",
      status: "cancelled",
      external_reference: userId,
    },
  })
  return mpSub
}

// Helpers (mapea estados de MP a tu enum)
export function mapMPStatusToLocal(mpStatus: string): SubscriptionStatus {
  switch (mpStatus) {
    case "pending": // Suscripción sin un medio de pago.
      return SubscriptionStatus.PENDING
    case "authorized": // Suscripción con un medio de pago válido.
    case "active": // mp not sent
      return SubscriptionStatus.ACTIVE
    case "paused": // Suscripción con cobro de pagos temporalmente descontinuado.
      return SubscriptionStatus.PAUSED
    case "cancelled": // Suscripción terminada. Este es un estado irreversible.
      return SubscriptionStatus.PAST_DUE
    default:
      return SubscriptionStatus.UNPAID // or PAST_DUE
  }
}

export function mapMPPaymentStatus(mpPay?: PaymentStatusMp): PaymentStatus {
  switch (mpPay) {
    case "pending":
      return PaymentStatus.PENDING
    case "approved":
      return PaymentStatus.APPROVED
    case "cancelled":
      return PaymentStatus.CANCELLED
    case "rejected":
      return PaymentStatus.REJECTED
    case "refunded":
      return PaymentStatus.REFUNDED
    default:
      return PaymentStatus.UNKNOWN
  }
}
