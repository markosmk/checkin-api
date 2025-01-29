type ParamsSendMail = {
  to: string
  subject: string
  html: string
  apiKey: string
}

export async function sendEmail({ to, subject, html, apiKey }: ParamsSendMail) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: "onboarding@resend.dev",
      to,
      subject,
      html,
    }),
  })
  if (!res.ok) {
    throw new Error("Failed to send email")
  }
}
