import { EmailTemplate, renderTemplate } from "./email-templates"
import type {
  CheckinCompletedVars,
  CheckinConfirmedVars,
  CheckinToCompleteVars,
  ResetPasswordVars,
  VerifyEmailVars,
} from "./email-templates"

type TemplateVarsMap = {
  [EmailTemplate.CHECKIN_COMPLETED]: CheckinCompletedVars
  [EmailTemplate.CHECKIN_CONFIRMED]: CheckinConfirmedVars
  [EmailTemplate.CHECKIN_TO_COMPLETE]: CheckinToCompleteVars
  [EmailTemplate.VERIFY_EMAIL]: VerifyEmailVars
  [EmailTemplate.RESET_PASSWORD]: ResetPasswordVars
}

type SendEmailWithTemplate<T extends EmailTemplate> = {
  to: string
  subject: string
  template: T
  vars: TemplateVarsMap[T]
  envs: Env
}

type SendEmailWithHtml = {
  to: string
  subject: string
  html: string
  envs: Env
}
export async function sendEmail<T extends EmailTemplate>(options: SendEmailWithTemplate<T> | SendEmailWithHtml) {
  let finalHtml: string

  if ("template" in options) {
    // TypeScript know that options.template is T and options.vars is TemplateVarsMap[T]
    finalHtml = renderTemplate(options.template, options.vars as Record<keyof T, string>)
  } else {
    finalHtml = options.html
  }

  if (!finalHtml) {
    throw new Error("sendEmail: falta html o template")
  }

  try {
    if (options.envs.ENVIRONMENT === "development") {
      console.log(`send email to: ${options.to}`)
      console.log(`subject: ${options.subject}`)
      console.log(`html: ${finalHtml}`)
      return true
    }
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${options.envs.SERVICE_EMAIL_API_KEY}`,
      },
      body: JSON.stringify({
        from: "onboarding@resend.dev",
        to: options.to,
        subject: `${options.subject} - ${options.envs.PLATFORM_NAME}`,
        html: finalHtml,
      }),
    })
    return true
  } catch (error) {
    console.log(error)
    throw new Error("No se pudo enviar el correo.")
  }
}
