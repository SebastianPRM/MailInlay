import { describe, expect, it, vi } from "vitest"

const holder = vi.hoisted(() => ({ client: null as unknown }))

vi.mock("imapflow", () => ({
  ImapFlow: vi.fn(function () {
    return holder.client
  }),
}))

import { deleteMessage, getMessage, getMessages } from "../src/server/imap"
import { encodeMessageKey } from "../src/server/message-key"
import type { MailboxConfig } from "../src/shared/types"

const mailbox: MailboxConfig = {
  id: "main",
  email: "mail@example.com",
  imap: { host: "imap.example.com", port: 993, secure: true, username: "mail@example.com", password: "secret" },
  smtp: { host: "smtp.example.com", port: 465, secure: true, username: "mail@example.com", password: "secret" },
}

function fakeMessage(uid: number, date = "2026-07-01T10:00:00Z") {
  return {
    uid,
    flags: new Set<string>(),
    envelope: { subject: `Wiadomość ${uid}`, date: new Date(date), from: [] },
    internalDate: new Date(date),
  }
}

function fakeClient(overrides: Record<string, unknown> = {}) {
  const client = {
    usable: true,
    connect: vi.fn(async () => undefined),
    logout: vi.fn(async () => undefined),
    close: vi.fn(() => undefined),
    getQuota: vi.fn(async () => false),
    list: vi.fn(async () => []),
    getMailboxLock: vi.fn(async (_folder?: string, _options?: unknown) => ({ release: vi.fn() })),
    mailbox: { exists: 0, uidValidity: BigInt(1) },
    fetchAll: vi.fn(async () => []),
    fetchOne: vi.fn(async () => null),
    search: vi.fn(async () => []),
    messageDelete: vi.fn(async () => true),
    ...overrides,
  }
  holder.client = client
  return client
}

describe("IMAP listing", () => {
  it("maps a page to the correct newest-first sequence range", async () => {
    const client = fakeClient({ mailbox: { exists: 100, uidValidity: BigInt(1) } })
    const response = await getMessages(mailbox, { folder: "INBOX", page: 2, limit: 30, query: "" })
    expect(client.fetchAll).toHaveBeenCalledWith("41:70", expect.anything())
    expect(response.total).toBe(100)
    expect(response.hasMore).toBe(true)
  })

  it("lists unread messages through a server-side UNSEEN search", async () => {
    const client = fakeClient({
      mailbox: { exists: 10, uidValidity: BigInt(1) },
      search: vi.fn(async () => [3, 5]),
      fetchAll: vi.fn(async () => [fakeMessage(5), fakeMessage(3)]),
    })
    const response = await getMessages(mailbox, { folder: "INBOX", page: 1, limit: 30, query: "", unseen: true })
    expect(client.search).toHaveBeenCalledWith({ seen: false }, { uid: true })
    expect(response.total).toBe(2)
    expect(response.items).toHaveLength(2)
    expect(response.items[0].subject).toBe("Wiadomość 5")
  })

  it("adds message body to search criteria only when requested", async () => {
    const client = fakeClient()
    await getMessages(mailbox, {
      folder: "INBOX",
      page: 1,
      limit: 30,
      query: "faktura",
      searchIn: "all",
    })
    expect(client.search).toHaveBeenCalledWith({
      or: [
        { from: "faktura" },
        { to: "faktura" },
        { cc: "faktura" },
        { subject: "faktura" },
        { body: "faktura" },
      ],
    }, { uid: true })
  })

  it("merges all-folder results by date and preserves their folder paths", async () => {
    let currentFolder = ""
    const client = fakeClient({
      list: vi.fn(async () => [
        { path: "INBOX", name: "Odebrane", flags: new Set<string>(), specialUse: "\\Inbox" },
        { path: "Sent", name: "Wysłane", flags: new Set<string>(), specialUse: "\\Sent" },
      ]),
      search: vi.fn(async () => currentFolder === "INBOX" ? [11] : [22]),
      fetchAll: vi.fn(async () => currentFolder === "INBOX"
        ? [fakeMessage(11, "2026-07-28T10:00:00Z")]
        : [fakeMessage(22, "2026-07-29T10:00:00Z")]),
    })
    client.getMailboxLock.mockImplementation(async (folder?: string) => {
      if (!folder) throw new Error("missing folder")
      currentFolder = folder
      client.mailbox = { exists: 1, uidValidity: folder === "INBOX" ? BigInt(10) : BigInt(20) }
      return { release: vi.fn() }
    })

    const response = await getMessages(mailbox, {
      folder: "INBOX",
      page: 1,
      limit: 30,
      query: "faktura",
      scope: "all",
    })

    expect(client.getMailboxLock).toHaveBeenCalledTimes(2)
    expect(response.total).toBe(2)
    expect(response.items.map((item) => item.folderPath)).toEqual(["Sent", "INBOX"])
    expect(response.items.map((item) => item.subject)).toEqual(["Wiadomość 22", "Wiadomość 11"])
  })
})

describe("IMAP message access", () => {
  it("treats a stale uidValidity as a missing message and releases the lock", async () => {
    const release = vi.fn()
    fakeClient({
      mailbox: { exists: 10, uidValidity: BigInt(999) },
      getMailboxLock: vi.fn(async () => ({ release })),
    })
    const key = encodeMessageKey({ folder: "INBOX", uidValidity: "1", uid: 5 })
    await expect(getMessage(mailbox, key)).rejects.toMatchObject({ code: "MESSAGE_NOT_FOUND", status: 404 })
    expect(release).toHaveBeenCalled()
  })

  it("refuses permanent delete outside the Trash folder", async () => {
    const client = fakeClient({
      mailbox: { exists: 10, uidValidity: BigInt(1) },
      list: vi.fn(async () => [
        { path: "INBOX", name: "INBOX", flags: new Set<string>() },
        { path: "Trash", name: "Trash", flags: new Set<string>(), specialUse: "\\Trash" },
      ]),
    })
    const key = encodeMessageKey({ folder: "INBOX", uidValidity: "1", uid: 5 })
    await expect(deleteMessage(mailbox, key)).rejects.toMatchObject({ code: "PERMANENT_DELETE_DENIED", status: 422 })
    expect(client.messageDelete).not.toHaveBeenCalled()
  })

  it("permanently deletes only inside the Trash folder", async () => {
    const client = fakeClient({
      mailbox: { exists: 10, uidValidity: BigInt(1) },
      list: vi.fn(async () => [
        { path: "INBOX", name: "INBOX", flags: new Set<string>() },
        { path: "Trash", name: "Trash", flags: new Set<string>(), specialUse: "\\Trash" },
      ]),
    })
    const key = encodeMessageKey({ folder: "Trash", uidValidity: "1", uid: 5 })
    await expect(deleteMessage(mailbox, key)).resolves.toEqual({ ok: true })
    expect(client.messageDelete).toHaveBeenCalledWith(5, { uid: true })
  })
})
