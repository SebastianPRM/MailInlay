import { describe, expect, it } from "vitest"
import type { MailboxConfig } from "../src/shared/types"
import { sendMessage } from "../src/server/smtp"

const mailbox: MailboxConfig = {
  id: "main",
  email: "mail@example.com",
  imap: { host: "imap.example.com", port: 993, secure: true, username: "mail@example.com", password: "secret" },
  smtp: { host: "smtp.example.com", port: 465, secure: true, username: "mail@example.com", password: "secret" },
}

function baseForm() {
  const form = new FormData()
  form.set("to", "recipient@example.com")
  form.set("subject", "Test")
  form.set("bodyText", "Treść")
  form.set("references", "[]")
  return form
}

describe("SMTP input limits", () => {
  it("rejects more than 25 recipients before opening SMTP", async () => {
    const form = baseForm()
    form.set("to", Array.from({ length: 26 }, (_, index) => `person${index}@example.com`).join(","))
    await expect(sendMessage(mailbox, form)).rejects.toMatchObject({ code: "LIMIT_EXCEEDED", status: 422 })
  })

  it("rejects a body larger than 1 MB before opening SMTP", async () => {
    const form = baseForm()
    form.set("bodyText", "a".repeat(1024 * 1024 + 1))
    await expect(sendMessage(mailbox, form)).rejects.toMatchObject({ code: "TOO_LARGE", status: 413 })
  })

  it("rejects header injection in the subject", async () => {
    const form = baseForm()
    form.set("subject", "Temat\r\nBcc: attacker@example.com")
    await expect(sendMessage(mailbox, form)).rejects.toMatchObject({ code: "INVALID_REQUEST", status: 400 })
  })

  it("rejects an oversized References entry before opening SMTP", async () => {
    const form = baseForm()
    form.set("references", JSON.stringify([`<${"a".repeat(1100)}@example.com>`]))
    await expect(sendMessage(mailbox, form)).rejects.toMatchObject({ code: "INVALID_REQUEST", status: 400 })
  })

  it("rejects an oversized In-Reply-To header before opening SMTP", async () => {
    const form = baseForm()
    form.set("inReplyTo", `<${"a".repeat(1100)}@example.com>`)
    await expect(sendMessage(mailbox, form)).rejects.toMatchObject({ code: "INVALID_REQUEST", status: 400 })
  })
})
