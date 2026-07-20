import { describe, expect, it, vi } from "vitest"
import { createMailInlayHandler } from "../src/next/createMailInlayHandler"
import { resetSendSlots } from "../src/server/rate-limit"
import type { MailboxConfig } from "../src/shared/types"

const mailboxStub: MailboxConfig = {
  id: "main",
  email: "mail@example.com",
  imap: { host: "imap.example.com", port: 993, secure: true, username: "mail@example.com", password: "secret" },
  smtp: { host: "smtp.example.com", port: 465, secure: true, username: "mail@example.com", password: "secret" },
}

describe("route authorization", () => {
  it("does not touch mailbox configuration without an authenticated panel session", async () => {
    const getMailbox = vi.fn()
    const handler = createMailInlayHandler({ getSession: async () => null, getMailbox })
    const response = await handler.GET(new Request("https://panel.example/api/admin/mail/folders?mailboxId=main"), { params: { mailinlay: ["folders"] } })
    expect(response.status).toBe(401)
    expect(getMailbox).not.toHaveBeenCalled()
  })

  it("passes the authenticated project to mailbox lookup and hides unavailable mailboxes", async () => {
    const getMailbox = vi.fn(async () => null)
    const handler = createMailInlayHandler({
      getSession: async () => ({ userId: "admin-a", projectId: "project-a" }),
      getMailbox,
    })
    const response = await handler.GET(new Request("https://panel.example/api/admin/mail/folders?mailboxId=other"), { params: { mailinlay: ["folders"] } })
    expect(response.status).toBe(404)
    expect(getMailbox).toHaveBeenCalledWith({ mailboxId: "other", session: { userId: "admin-a", projectId: "project-a" } })
  })

  it("rejects cross-origin mutations before authentication", async () => {
    const handler = createMailInlayHandler({ getSession: async () => null, getMailbox: async () => null })
    const response = await handler.POST(new Request("https://panel.example/api/admin/mail/send?mailboxId=main", {
      method: "POST",
      headers: { origin: "https://attacker.example" },
      body: new FormData(),
    }), { params: { mailinlay: ["send"] } })
    expect(response.status).toBe(403)
    expect(await response.json()).toMatchObject({ error: { code: "FORBIDDEN_ORIGIN" } })
  })

  it("rejects mutations without an Origin header", async () => {
    const handler = createMailInlayHandler({ getSession: async () => null, getMailbox: async () => null })
    const response = await handler.PATCH(new Request("https://panel.example/api/admin/mail/messages/key?mailboxId=main", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ seen: true }),
    }), { params: { mailinlay: ["messages", "key"] } })
    expect(response.status).toBe(403)
  })

  it("accepts an explicitly allowed extra origin for mutations", async () => {
    const handler = createMailInlayHandler({
      getSession: async () => null,
      getMailbox: async () => null,
      allowedOrigins: ["https://public.example"],
    })
    const response = await handler.PATCH(new Request("https://internal.local/api/admin/mail/messages/key?mailboxId=main", {
      method: "PATCH",
      headers: { "content-type": "application/json", origin: "https://public.example" },
      body: JSON.stringify({ seen: true }),
    }), { params: { mailinlay: ["messages", "key"] } })
    expect(response.status).toBe(401)
  })

  it("rate-limits sending after 10 messages per minute for a session", async () => {
    resetSendSlots()
    const handler = createMailInlayHandler({
      getSession: async () => ({ userId: "admin-a", projectId: "project-a" }),
      getMailbox: async () => mailboxStub,
    })
    const sendRequest = () => handler.POST(new Request("https://panel.example/api/admin/mail/send?mailboxId=main", {
      method: "POST",
      headers: { origin: "https://panel.example" },
      body: new FormData(),
    }), { params: { mailinlay: ["send"] } })

    for (let index = 0; index < 10; index += 1) {
      const response = await sendRequest()
      expect(response.status).toBe(400)
    }
    const limited = await sendRequest()
    expect(limited.status).toBe(429)
    expect(await limited.json()).toMatchObject({ error: { code: "TOO_MANY_REQUESTS" } })
    resetSendSlots()
  })
})
