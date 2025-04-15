import { createId } from "@paralleldrive/cuid2"
import { type InferSelectModel, relations } from "drizzle-orm"
import { sqliteTable, text, integer, index, uniqueIndex, primaryKey } from "drizzle-orm/sqlite-core"
import {
  type AdditionalPaxProps,
  BookingStatus,
  FieldsAvailable,
  type FilesBooking,
  type OptionsHotel,
  type AdditionalHotelProps,
  SubscriptionPlan,
  SubscriptionStatus,
  BillingCycle,
  type PaymentStatus,
} from "./enum"

export const users = sqliteTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  email: text("email").unique().notNull(),
  password: text("password"),
  name: text("name"),
  avatar: text("avatar"),
  emailVerified: integer("email_verified", { mode: "boolean" }).default(false).notNull(),
  lastLogin: integer("last_login", { mode: "timestamp_ms" }),
  createdAt: text("created_at")
    .$defaultFn(() => new Date().toISOString())
    .notNull(),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString())
    .$onUpdateFn(() => new Date().toISOString()),
  // use this when user has suscription, but not active, then delete account user (not delete user db)
  deletedAt: text("deleted_at"),
})
export type User = Omit<InferSelectModel<typeof users>, "password">

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at", {
    mode: "timestamp",
  }).notNull(),
  deviceInfo: text("device_info"),
})
export type Session = InferSelectModel<typeof sessions> & {
  /** es true cuando el tiempo de expiracion aun no pasa mas de la mitad del periodo configurado, se coloca en true, para volver a setear la cookie y extender el tiempo de la sesion (expires) */
  fresh: boolean
}

export enum TypeUseToken {
  RESET_PASSWORD = "reset_password",
  VERIFY_EMAIL = "verify_email",
}
export const usersTokens = sqliteTable(
  "users_tokens",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    typeUse: text("type_use").$type<TypeUseToken>().notNull().default(TypeUseToken.RESET_PASSWORD),
    email: text("email").notNull(),
    code: text("code").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => [
    index("users_tokens_user_id_type_use_idx").on(table.userId, table.typeUse),
    index("users_tokens_email_type_use_idx").on(table.email, table.typeUse),
  ]
)

export const oauthAccounts = sqliteTable(
  "oauth_accounts",
  {
    provider: text("provider").notNull(),
    providerUserId: text("provider_user_id").notNull().unique(), // too key primary? redundancia o disonancia
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.provider, table.providerUserId] })]
)
export type OAuthAccount = InferSelectModel<typeof oauthAccounts>

export const hotels = sqliteTable(
  "hotels",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    coverImage: text("cover_image"),
    type: text("type"),
    subType: text("sub_type"),
    phone: text("phone").notNull(),
    email: text("email").notNull(),
    domain: text("domain"),
    options: text("options", { mode: "json" }).$type<OptionsHotel>(), // SQLite doesn't support jsonb, storing as text
    isPublic: integer("is_public", { mode: "boolean" }).default(false).notNull(),
    isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
    // allowedFields: text("allowed_fields", { mode: "json" }).$type<FieldsAvailable[]>(),
    additionalProps: text("additional_props", { mode: "json" }).$type<AdditionalHotelProps>(), //jsonb(),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString())
      .$onUpdateFn(() => new Date().toISOString()),
  },
  (table) => [index("hotels_user_id_idx").on(table.userId), uniqueIndex("hotels_slug_idx").on(table.slug)]
)
export type Hotel = InferSelectModel<typeof hotels>

export const bookings = sqliteTable(
  "bookings",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    hotelId: text("hotel_id")
      .notNull()
      .references(() => hotels.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    reservationId: text("reservation_id").notNull().unique(),
    checkin: text().notNull(), // at to save, save in ISO date string
    checkout: text(), //  ISO date string
    status: text().$type<BookingStatus>().default(BookingStatus.UNKNOWN).notNull(),
    nights: integer(),
    observations: text(),
    isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
    isLocked: integer("is_locked", { mode: "boolean" }).default(false).notNull(),
    maxPaxs: integer("max_paxs", { mode: "number" }),
    // requiredFields: text("required_fields", { mode: "json" }).$type<FieldsAvailable[]>(),
    // allowedFields: text("allowed_fields", { mode: "json" }).$type<FieldsAvailable[]>(),
    signature: text("signature"), // base64 o URL
    completedAt: text("completed_at"),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString())
      .$onUpdateFn(() => new Date().toISOString()),
  },
  (table) => [
    index("bookings_hotelId_idx").on(table.hotelId),
    index("bookings_reservationId_idx").on(table.reservationId),
    index("bookings_userId_idx").on(table.userId),
    // TODO check if necesary index or defined other
    index("bookings_id_reservation_id_hotel_id_idx").on(table.id, table.reservationId, table.hotelId),
  ]
)
export type Booking = InferSelectModel<typeof bookings>

export const paxs = sqliteTable(
  "paxs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    bookingId: text("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    firstname: text().notNull(),
    lastname: text().notNull(),
    birthDate: text("birth_date"), // autocomplete with OCR
    email: text(), // only titular
    phone: text(), // only titular
    docType: text("doc_type").notNull(),
    docNumber: text("doc_number").notNull(),
    nationalityCode: text("nationality_code"),
    arrivalDate: text("arrival_date"), // ISO date string con hora aproximada de llegada.. only titular
    isContact: integer("is_contact", { mode: "boolean" }).default(false).notNull(),
    files: text("files", { mode: "json" }).$type<FilesBooking>(),
    guestObservations: text("guest_observations"),
    additionalProps: text("additional_props", { mode: "json" }).$type<AdditionalPaxProps>(),
    // DATES
    // one time is setted, when pax click on Guardar
    submittedAt: text("submitted_at"),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString())
      .$onUpdateFn(() => new Date().toISOString()),
  },
  (table) => [index("pax_bookingId_idx").on(table.bookingId)]
)

export const subscriptions = sqliteTable(
  "subscriptions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("user_id")
      .notNull()
      // restric:"not allow to delete user if have active subscription"
      .references(() => users.id, { onDelete: "restrict", onUpdate: "cascade" }),
    // Identify of gateway
    gatewayCustomerId: text("gateway_customer_id").notNull(),
    gatewaySubscriptionId: text("gateway_subscription_id").notNull(),
    gatewayPlanId: text("gateway_plan_id"),

    // Dates Importants
    subscribedAt: text("subscribed_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()), // as createdAt
    trialEndsAt: text("trial_ends_at"), // ISO date
    canceledAt: text("canceled_at"), // ISO date
    gatewayNextPaymentDate: text("gateway_next_payment_date"),

    // Lógic Bussinnes
    hadTrial: integer("had_trial", { mode: "boolean" }).default(false).notNull(),
    plan: text().$type<SubscriptionPlan>().default(SubscriptionPlan.FREE).notNull(),
    status: text().$type<SubscriptionStatus>().default(SubscriptionStatus.ACTIVE).notNull(),
    billingCycle: text("billing_cycle").$type<BillingCycle>().default(BillingCycle.MONTHLY).notNull(),
    reasonCanceled: text("reason_canceled"),
    updatedAt: text("updated_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString())
      .$onUpdateFn(() => new Date().toISOString()),
  },
  (table) => [
    // uniqueIndex("subscriptions_gateway_customer_id_idx").on(table.gatewayCustomerId),
    uniqueIndex("subscriptions_gateway_subscription_id_idx").on(table.gatewaySubscriptionId),
    index("subscriptions_user_id_idx").on(table.userId),
    // uniqueIndex("subscriptions_user_id_idx").on(table.userId),
  ]
)
export type Subscription = InferSelectModel<typeof subscriptions>

export const transactions = sqliteTable(
  "transactions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict", onUpdate: "cascade" }),
    subscriptionId: text("subscription_id")
      .notNull()
      .references(() => subscriptions.id, { onDelete: "cascade", onUpdate: "cascade" }),
    amount: integer("amount", { mode: "number" }).notNull(),
    currency: text("currency").$type<"ARS" | "USD">().default("ARS").notNull(),
    status: text("status").$type<PaymentStatus>().notNull(),
    description: text(),
    gateway: text("gateway", { enum: ["mercadopago", "stripe"] }).notNull(),
    gatewayTransactionId: text("gateway_transaction_id"),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => [
    index("transactions_subscriptionId_idx").on(table.subscriptionId),
    index("transactions_userId_idx").on(table.userId),
  ]
)

export const paxRelations = relations(paxs, ({ one }) => ({
  booking: one(bookings, {
    fields: [paxs.bookingId],
    references: [bookings.id],
  }),
}))

export const bookingRelations = relations(bookings, ({ one, many }) => ({
  paxs: many(paxs),
  user: one(users, {
    fields: [bookings.userId],
    references: [users.id],
  }),
  hotel: one(hotels, {
    fields: [bookings.hotelId],
    references: [hotels.id],
  }),
}))

export const hotelRelations = relations(hotels, ({ one, many }) => ({
  bookings: many(bookings),
  user: one(users, {
    fields: [hotels.userId],
    references: [users.id],
  }),
}))

export const userRelations = relations(users, ({ many }) => ({
  bookings: many(bookings),
  hotels: many(hotels),
  tokens: many(usersTokens),
  subscriptions: many(subscriptions),
  transactions: many(transactions),
}))

export const userTokensRelations = relations(usersTokens, ({ one }) => ({
  user: one(users, {
    fields: [usersTokens.userId],
    references: [users.id],
  }),
}))

export const subscriptionRelations = relations(subscriptions, ({ one, many }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
  transactions: many(transactions),
}))

export const transactionRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
  subscription: one(subscriptions, {
    fields: [transactions.subscriptionId],
    references: [subscriptions.id],
  }),
}))
