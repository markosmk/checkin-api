export type ClientData = {
  firstname: string
  lastname: string
  email: string
}

export type AdditionalHotelProps = {
  rooms?: number
  stars?: number
  amenities?: string[]
  // rooms: integer("rooms"), // unnecesary
  // website: text("website"),
  // location: text("location"), // SQLite doesn't support jsonb, storing as text
}

export const BookingStatus = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  CANCELED: "canceled",
  COMPLETED: "completed",
  UNKNOWN: "unknown",
} as const
export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus]

export enum FieldsAvailable {
  CAR_MODEL = "carModel",
  CAR_PLATE = "carPlate",
  COUNTRY = "country",
  CITY = "city",
  ZIP_CODE = "zipCode",
  ADDRESS = "address",
  GENDER = "gender",
}

// this may change without changes DB
export type AdditionalPaxProps = {
  departureDate?: string | Date // primary
  carModel?: string // primary
  carPlate?: string // primary
  country?: string
  city?: string
  zipCode?: string
  address?: string
  gender?: string
}

export type FilesBooking = {
  docFrontPath: string
  docBackPath: string
  passportPath: string
  pdfPath: string
}

// to customize colors, or style page..
export type OptionsHotel = {}

export const SubscriptionPlan = {
  FREE: "free",
  PRO: "pro",
  // BUSINESS: "business",
} as const
export type SubscriptionPlan = (typeof SubscriptionPlan)[keyof typeof SubscriptionPlan]

export enum SubscriptionStatus {
  ACTIVE = "active",
  CANCELED = "canceled",
  PAUSED = "paused",
  PAST_DUE = "past_due",
  UNPAID = "unpaid",
}

export enum BillingCycle {
  MONTHLY = "monthly",
  ANNUAL = "annual",
}

export enum PaymentStatus {
  PENDING = "pending",
  SUCCESS = "success", // or completed
  FAILED = "failed",
  REFUNDED = "refunded",
}
