export type WBSubscriptionBody = {
  id: string // ID de la notificación
  type: WBTopic // 'subscription_preapproval', | 'subscription_authorized_payment' | 'topic_claims_integration_wh' Tipo de notificacion recebida e acuerdo con el tópico previamente seleccionado (payments, mp-connect,
  date: string // Fecha de creación del recurso notificado
  action: string //'updated', Evento notificado, que indica si es una actualización de un recurso o la creación de uno nuevo
  application_id: string
  data: {
    id: string // ID del pago, de la orden comercial o del reclamo.
  }
  entity: string // 'preapproval'
  version: number // 8
}

// https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks#editor_10
export type WBPaymentBody = {
  id: string
  type: string // 'payment' Tipo de notificacion recebida e acuerdo con el tópico previamente seleccionado (payments, mp-connect, subscription, claim, automatic-payments, etc)
  date_created: string // Fecha de creación del recurso notificado
  api_version: string //'v1', Valor que indica la versión de la API que envía la notificación
  live_mode: false // Indica si la URL ingresada es válida.
  user_id: number // Identificador del vendedor
  data: {
    id: string // ID del pago, de la orden comercial o del reclamo.
  }
  action: string // 'payment.updated' // Evento notificado, que indica si es una actualización de un recurso o la creación de uno nuevo
}

// events of notifications
export type WBTopic =
  | "subscription_authorized_payment" // Pago recurrente de una suscripción (creación y actualización)
  | "subscription_preapproval" // Vinculación de una suscripción (creación y actualización)
  | "topic_claims_integration_wh" // Creación de reclamos y reembolsos
  | "payment" // Creación y actualización de pagos
