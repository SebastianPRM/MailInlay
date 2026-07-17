import nodemailer from "nodemailer"
import { addressParser, type Address } from "postal-mime"
import { emailSchema } from "../shared/schemas"
import { errors, MailInlayError } from "../shared/errors"
import type { EmailAddress, MailboxConfig, SendResponse } from "../shared/types"
import {
  MAX_BODY_BYTES,
  MAX_RECIPIENTS,
  MAX_SUBJECT_LENGTH,
  MAX_UPLOAD_FILE_BYTES,
  MAX_UPLOAD_FILES,
  MAX_UPLOAD_TOTAL_BYTES,
} from "./limits"
import { appendSentMessage } from "./imap"
import { sanitizeOutgoingHtml, stripHtml } from "./sanitizer"

type Upload = { filename: string; contentType: string; content: Buffer }

function flattenAddresses(entries: Address[]): EmailAddress[] {
  const result: EmailAddress[] = []
  for (const entry of entries) {
    if ("group" in entry && entry.group) {
      for (const member of entry.group) {
        if (member.address) result.push({ name: member.name || undefined, address: member.address })
      }
    } else if (entry.address) {
      result.push({ name: entry.name || undefined, address: entry.address })
    }
  }
  return result
}

function parseRecipients(value: string): EmailAddress[] {
  if (!value.trim()) return []
  const entries = flattenAddresses(addressParser(value.replace(/;/g, ","), { flatten: true }))
  if (!entries.length) throw errors.invalidRequest()
  return entries.map((entry) => ({ ...entry, address: emailSchema.parse(entry.address) }))
}

function field(form: FormData, name: string): string {
  const value = form.get(name)
  return typeof value === "string" ? value : ""
}

function rejectHeaderInjection(value: string) {
  if (/\r|\n/.test(value)) throw errors.invalidRequest()
}

function textToHtml(value: string): string {
  return value
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")}</p>`)
    .join("")
}

function parseReferences(value: string): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) throw new Error("invalid")
    return parsed.filter((item): item is string => typeof item === "string").slice(0, 50)
  } catch {
    throw errors.invalidRequest()
  }
}

async function parseUploads(form: FormData): Promise<Upload[]> {
  const values = form.getAll("attachments")
  if (values.length > MAX_UPLOAD_FILES) throw errors.limitExceeded("Można dodać maksymalnie 10 załączników.")
  const uploads: Upload[] = []
  let total = 0
  for (const value of values) {
    if (typeof value === "string") continue
    if (value.size > MAX_UPLOAD_FILE_BYTES) throw errors.tooLarge("Pojedynczy plik może mieć maksymalnie 3 MB.")
    const content = Buffer.from(await value.arrayBuffer())
    total += content.length
    if (total > MAX_UPLOAD_TOTAL_BYTES) throw errors.tooLarge("Załączniki mogą mieć łącznie maksymalnie 3 MB.")
    uploads.push({
      filename: value.name.replace(/[\r\n]/g, "").slice(0, 255) || "zalacznik",
      contentType: value.type || "application/octet-stream",
      content,
    })
  }
  return uploads
}

function isTimeout(error: unknown): boolean {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code) : ""
  return ["ETIMEDOUT", "ESOCKETTIMEDOUT", "ETIMEOUT"].includes(code)
}

export async function sendMessage(config: MailboxConfig, form: FormData): Promise<SendResponse> {
  try {
    const to = parseRecipients(field(form, "to"))
    const cc = parseRecipients(field(form, "cc"))
    const bcc = parseRecipients(field(form, "bcc"))
    const recipients = [...to, ...cc, ...bcc]
    if (!recipients.length) throw errors.invalidRequest()
    if (recipients.length > MAX_RECIPIENTS) throw errors.limitExceeded("Wiadomość może mieć maksymalnie 25 odbiorców.")

    const subject = field(form, "subject").trim()
    rejectHeaderInjection(subject)
    if (!subject || subject.length > MAX_SUBJECT_LENGTH) throw errors.invalidRequest()

    const bodyText = field(form, "bodyText")
    const bodyHtmlInput = field(form, "bodyHtml")
    const quotedText = field(form, "quotedText")
    const quotedHtmlInput = field(form, "quotedHtml")
    if (Buffer.byteLength(bodyText + bodyHtmlInput + quotedText + quotedHtmlInput, "utf8") > MAX_BODY_BYTES) {
      throw errors.tooLarge("Treść wiadomości jest za duża.")
    }

    const inReplyTo = field(form, "inReplyTo").trim() || undefined
    if (inReplyTo) rejectHeaderInjection(inReplyTo)
    const references = parseReferences(field(form, "references"))
    references.forEach(rejectHeaderInjection)
    const uploads = await parseUploads(form)

    const bodyHtml = sanitizeOutgoingHtml(bodyHtmlInput || textToHtml(bodyText))
    const signatureHtml = config.signatureHtml ? sanitizeOutgoingHtml(config.signatureHtml) : ""
    const quotedHtml = quotedHtmlInput ? sanitizeOutgoingHtml(quotedHtmlInput) : ""
    const html = [bodyHtml, signatureHtml, quotedHtml].filter(Boolean).join("<br>")
    const text = [bodyText || stripHtml(bodyHtml), signatureHtml ? stripHtml(signatureHtml) : "", quotedText]
      .filter(Boolean)
      .join("\n\n")

    const buildTransport = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: "windows" })
    const compiled = await buildTransport.sendMail({
      from: { name: config.displayName || config.email, address: config.email },
      to, cc, bcc, subject, html, text,
      inReplyTo,
      references: references.length ? references : undefined,
      attachments: uploads,
    })
    const raw = Buffer.isBuffer(compiled.message) ? compiled.message : Buffer.from("")
    if (!raw.length) throw errors.mailServer()

    const smtp = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      requireTLS: !config.smtp.secure,
      auth: { user: config.smtp.username, pass: config.smtp.password },
      tls: { rejectUnauthorized: true, servername: config.smtp.host },
      connectionTimeout: 8_000,
      greetingTimeout: 8_000,
      socketTimeout: 20_000,
    })
    try {
      await smtp.sendMail({ envelope: compiled.envelope, raw })
    } finally {
      smtp.close()
    }

    if (config.saveToSent === false) {
      return { ok: true, sent: true, savedToSent: true, messageId: compiled.messageId }
    }

    try {
      const saved = await appendSentMessage(config, raw)
      return {
        ok: true,
        sent: true,
        savedToSent: saved.saved,
        warning: saved.saved ? undefined : saved.warning,
        messageId: compiled.messageId,
      }
    } catch {
      return { ok: true, sent: true, savedToSent: false, warning: "SENT_SAVE_FAILED", messageId: compiled.messageId }
    }
  } catch (error) {
    if (error instanceof MailInlayError) throw error
    if (isTimeout(error)) throw errors.timeout()
    throw errors.mailServer()
  }
}
