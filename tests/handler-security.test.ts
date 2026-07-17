import { describe, expect, it, vi } from "vitest"
import { createMailInlayHandler } from "../src/next/createMailInlayHandler"

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
})
