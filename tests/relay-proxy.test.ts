import { afterEach, describe, expect, it, vi } from "vitest"

const holder = vi.hoisted(() => ({ client: null as unknown }))

vi.mock("imapflow", () => ({
  ImapFlow: vi.fn(function () {
    return holder.client
  }),
}))

import { createMailInlayProxy } from "../src/next/proxy"
import { createMailInlayRelay } from "../src/next/relay"
import type { MailboxConfig } from "../src/shared/types"

const secret = "0123456789abcdef0123456789abcdef"
const relayUrl = "https://relay.test/api/relay"

const mailbox: MailboxConfig = {
  id: "main",
  email: "mail@example.com",
  imap: { host: "imap.example.com", port: 993, secure: true, username: "mail@example.com", password: "top-secret" },
  smtp: { host: "smtp.example.com", port: 465, secure: true, username: "mail@example.com", password: "top-secret" },
}

function fakeImapClient() {
  holder.client = {
    usable: true,
    connect: vi.fn(async () => undefined),
    logout: vi.fn(async () => undefined),
    close: vi.fn(() => undefined),
    getQuota: vi.fn(async () => false),
    list: vi.fn(async () => []),
  }
}

function buildProxy(overrides: Partial<Parameters<typeof createMailInlayProxy>[0]> = {}) {
  return createMailInlayProxy({
    relayUrl,
    secret,
    getSession: async () => ({ userId: "admin-1", projectId: "project-a" }),
    getMailbox: async () => mailbox,
    ...overrides,
  })
}

function stubFetchWithRelay(relay: ReturnType<typeof createMailInlayRelay>) {
  const seen: { url: URL; headers: Headers }[] = []
  vi.stubGlobal("fetch", async (input: URL | string, init?: RequestInit) => {
    const url = new URL(String(input))
    const request = new Request(url, { method: init?.method, headers: init?.headers, body: init?.body as BodyInit })
    seen.push({ url, headers: request.headers })
    const parts = url.pathname.split("/").filter(Boolean).slice(2)
    const context = { params: { mailinlay: parts } }
    if (request.method === "PATCH") return relay.PATCH(request, context)
    if (request.method === "POST") return relay.POST(request, context)
    if (request.method === "DELETE") return relay.DELETE(request, context)
    return relay.GET(request, context)
  })
  return seen
}

afterEach(() => vi.unstubAllGlobals())

describe("MailInlay proxy and relay", () => {
  it("forwards an authorized request end to end without exposing credentials", async () => {
    fakeImapClient()
    const seen = stubFetchWithRelay(createMailInlayRelay({ secret }))
    const proxy = buildProxy()

    const response = await proxy.GET(
      new Request("https://panel.example/api/admin/mail/folders?mailboxId=main"),
      { params: { mailinlay: ["folders"] } },
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.mailbox).toMatchObject({ id: "main", email: "mail@example.com" })

    expect(seen).toHaveLength(1)
    expect(seen[0].url.pathname).toBe("/api/relay/folders")
    expect(seen[0].url.searchParams.get("mailboxId")).toBe("main")
    const box = seen[0].headers.get("x-mailinlay-box") ?? ""
    expect(box).not.toContain("top-secret")
    expect(seen[0].headers.get("x-mailinlay-user")).toBe("admin-1")
  })

  it("relays mutations with a matching relay-side origin check", async () => {
    fakeImapClient()
    stubFetchWithRelay(createMailInlayRelay({ secret }))
    const proxy = buildProxy()

    const response = await proxy.PATCH(
      new Request("https://panel.example/api/admin/mail/messages/not-a-real-key?mailboxId=main", {
        method: "PATCH",
        headers: { origin: "https://panel.example", "content-type": "application/json" },
        body: JSON.stringify({ seen: true }),
      }),
      { params: { mailinlay: ["messages", "not-a-real-key"] } },
    )

    expect(response.status).toBe(404)
    expect(await response.json()).toMatchObject({ error: { code: "MESSAGE_NOT_FOUND" } })
  })

  it("requires a local panel session before anything reaches the relay", async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal("fetch", fetchSpy)
    const proxy = buildProxy({ getSession: async () => null })

    const response = await proxy.GET(
      new Request("https://panel.example/api/admin/mail/folders?mailboxId=main"),
      { params: { mailinlay: ["folders"] } },
    )

    expect(response.status).toBe(401)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("rejects cross-origin mutations before contacting the relay", async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal("fetch", fetchSpy)
    const proxy = buildProxy()

    const response = await proxy.DELETE(
      new Request("https://panel.example/api/admin/mail/messages/key?mailboxId=main", {
        method: "DELETE",
        headers: { origin: "https://attacker.example" },
      }),
      { params: { mailinlay: ["messages", "key"] } },
    )

    expect(response.status).toBe(403)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("rejects relay calls without a valid bearer token", async () => {
    const relay = createMailInlayRelay({ secret })
    const response = await relay.GET(
      new Request("https://relay.test/api/relay/folders?mailboxId=main", {
        headers: { authorization: "Bearer wrong-token" },
      }),
      { params: { mailinlay: ["folders"] } },
    )
    expect(response.status).toBe(401)
  })
})
