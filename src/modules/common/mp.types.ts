export type SubscriptionStatus =
  | "pending" // Suscripción sin un medio de pago.
  | "authorized" // Suscripción con un medio de pago válido.
  | "paused" // Suscripción con cobro de pagos temporalmente descontinuado.
  | "cancelled" // Suscripción terminada. Este es un estado irreversible.

export type PaymentStatusMp =
  | "pending" // : El usuario aún no ha completado el proceso de pago (por ejemplo, después de generar un boleto, el pago se completará cuando el usuario pague en el lugar seleccionado).
  | "approved" // : El pago ha sido aprobado y acreditado con éxito.
  | "authorized" // : El pago ha sido autorizado pero aún no se ha capturado.
  | "in_process" // : El pago está en proceso de revisión.
  | "in_mediation" // : El usuario ha iniciado una disputa.
  | "rejected" // : El pago fue rechazado (el usuario puede intentar pagar nuevamente).
  | "cancelled" // : El pago fue cancelado por alguna de las partes o caducó.
  | "refunded" // : El pago fue reembolsado al usuario.
  | "charged_back" // : Se realizó un contracargo en la tarjeta de crédito del comprador.
