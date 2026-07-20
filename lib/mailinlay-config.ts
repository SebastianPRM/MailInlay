import type { GetMailbox, GetSession, MailboxConfig } from "@mailinlay/sdk/next"

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"])

export const getSession: GetSession = async (request) => {
  // The hostname checks below derive from the client-controlled Host header, so
  // they are not a real boundary — the demo session must never exist in production.
  if (process.env.NODE_ENV === "production") return null
  const url = new URL(request.url)
  let host: string
  try { host = new URL(`http://${request.headers.get("host") ?? ""}`).hostname } catch { return null }
  if (process.env.MAILINLAY_DEMO_MODE !== "true" || !LOCAL_HOSTS.has(url.hostname) || !LOCAL_HOSTS.has(host)) return null
  return { userId: "local-admin", projectId: "mailinlay-demo" }
}

export const getMailbox: GetMailbox = async ({ mailboxId, session }) => {
  if (session.projectId !== "mailinlay-demo" || mailboxId !== "main") return null

  const email = process.env.MAILINLAY_EMAIL
  const password = process.env.MAILINLAY_PASSWORD
  if (!email || !password) throw new Error("Brakuje konfiguracji MAILINLAY_EMAIL lub MAILINLAY_PASSWORD.")

  const mailbox: MailboxConfig = {
    id: "main",
    email,
    displayName: process.env.MAILINLAY_DISPLAY_NAME || "Agentic Ads",
    imap: {
      host: process.env.MAILINLAY_IMAP_HOST || "imap.iq.pl",
      port: Number(process.env.MAILINLAY_IMAP_PORT || 993),
      secure: process.env.MAILINLAY_IMAP_SECURE !== "false",
      username: email,
      password,
    },
    smtp: {
      host: process.env.MAILINLAY_SMTP_HOST || "smtp.iq.pl",
      port: Number(process.env.MAILINLAY_SMTP_PORT || 465),
      secure: process.env.MAILINLAY_SMTP_SECURE !== "false",
      username: email,
      password,
    },
    signatureHtml: process.env.MAILINLAY_SIGNATURE_HTML || "<p>Pozdrawiam,<br><strong>Agentic Ads</strong></p>",
    saveToSent: true,
  }

  return mailbox
}
