import { SubscriptionPlan } from "../db/enum"

export const PLANS: Record<
  SubscriptionPlan,
  {
    name: string
    maxHotels: number
    maxActiveBookings: number
    allowFileUploads: boolean
    allowDigitalSignatures: boolean
    reports: "basic" | "advanced"
    integrations: string[]
    maxPaxPerBooking: number
  }
> = {
  free: {
    name: "Free",
    maxHotels: 1,
    maxActiveBookings: 5,
    allowFileUploads: false,
    allowDigitalSignatures: false,
    reports: "basic",
    integrations: ["calendar"],
    /** Cantidad máxima de huespedes por reserva */
    maxPaxPerBooking: 5,
  },
  pro: {
    name: "Pro",
    maxHotels: 3,
    maxActiveBookings: 100,
    allowFileUploads: true,
    allowDigitalSignatures: true,
    reports: "advanced",
    integrations: ["calendar", "pms"],
    maxPaxPerBooking: 10,
  },
  // business: {
  //   name: "Business",
  //   maxHotels: 20,
  //   maxActiveBookings: 999,
  //   allowFileUploads: true,
  //   allowDigitalSignatures: true,
  //   reports: "full",
  //   integrations: ["calendar", "pms", "externalPayments"],
  //   maxPaxPerBooking: 999,
  // },
}
