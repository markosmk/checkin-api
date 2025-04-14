export interface CheckinCompletedVars {
  hotelManagerName: string
  contactName: string
  reservationId: string
  hotelName: string
  checkinDate: string
  checkinTime: string
  adminLink: string
}

export interface CheckinConfirmedVars {
  contactName: string
  reservationId: string
  hotelName: string
  checkinDate: string
  checkinTime: string
}

export interface CheckinToCompleteVars {
  guestName: string
  reservationId: string
  hotelName: string
  checkinDate: string
  link: string
}

export interface VerifyEmailVars {
  name: string
  verificationLink: string
}

export interface ResetPasswordVars {
  name: string
  resetLink: string
}

export enum EmailTemplate {
  CHECKIN_COMPLETED = "checkin-completed",
  CHECKIN_CONFIRMED = "checkin-confirmed",
  CHECKIN_TO_COMPLETE = "checkin-to-complete",
  RESET_PASSWORD = "reset-password",
  VERIFY_EMAIL = "verify-email",
}

const templates: Record<EmailTemplate, string> = {
  [EmailTemplate.CHECKIN_COMPLETED]: `
      <h1>¡Nuevo check‑in pendiente de revisión!</h1>
      <p>Hola {{hotelManagerName}},</p>
      <p>El huésped <strong>{{contactName}}</strong> ha completado el check‑in para la reserva <strong>{{reservationId}}</strong> en {{hotelName}}.</p>
      <p>Detalles de la llegada:</p>
      <ul>
        <li>Fecha: {{checkinDate}}</li>
        <li>Hora aproximada: {{checkinTime}}</li>
      </ul>
      <p>Puedes revisar y confirmar la información en tu panel:</p>
      <p><a href="{{adminLink}}">Ver check‑in en el panel</a></p>
    `,

  [EmailTemplate.CHECKIN_CONFIRMED]: `
      <h1>¡Check‑in confirmado!</h1>
      <p>Hola {{contactName}},</p>
      <p>Tu check‑in para la reserva <strong>{{reservationId}}</strong> en {{hotelName}} ha sido revisado y confirmado por el hotel.</p>
      <p>Te esperamos el día {{checkinDate}} a las {{checkinTime}}.</p>
      <p>Si necesitas cambiar algo, contáctanos.</p>
    `,

  [EmailTemplate.CHECKIN_TO_COMPLETE]: `
      <h1>¡Completa tu check‑in online!</h1>
      <p>Hola {{guestName}},</p>
      <p>Tu reserva <strong>{{reservationId}}</strong> en {{hotelName}} tiene fecha de llegada el {{checkinDate}}.</p>
      <p>Para agilizar tu ingreso, por favor completa tu check‑in ahora:</p>
      <p><a href="{{link}}">Completar check‑in</a></p>
      <p>Este enlace estará disponible hasta {{checkinDate}}.</p>
    `,

  [EmailTemplate.VERIFY_EMAIL]: `
      <h1>Verifica tu correo electrónico</h1>
      <p>Hola {{name}},</p>
      <p>Gracias por registrarte. Para activar tu cuenta, haz clic en el siguiente enlace:</p>
      <p><a href="{{verificationLink}}">{{verificationLink}}</a></p>
      <p>Si no creaste esta cuenta, ignora este mensaje.</p>
    `,

  [EmailTemplate.RESET_PASSWORD]: `
      <h1>Restablece tu contraseña</h1>
      <p>Hola {{name}},</p>
      <p>Recibimos una solicitud para cambiar tu contraseña. Haz clic aquí para restablecerla:</p>
      <p><a href="{{resetLink}}">{{resetLink}}</a></p>
      <p>Si no solicitaste este cambio, ignora este correo.</p>
    `,
}

export function renderTemplate(templateName: EmailTemplate, vars: Record<string, string | number>): string {
  const tpl = templates[templateName]
  return tpl.replace(/{{\s*([^}\s]+)\s*}}/g, (_, key) => {
    const val = vars[key]
    return val !== undefined ? String(val) : ""
  })
}
