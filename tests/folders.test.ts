import { describe, expect, it } from "vitest"
import type { ListResponse } from "imapflow"
import { mapFolders } from "../src/server/folders"
import type { MailboxConfig } from "../src/shared/types"

const config: MailboxConfig = {
  id: "main",
  email: "mail@example.com",
  imap: { host: "imap.example.com", port: 993, secure: true, username: "mail@example.com", password: "secret" },
  smtp: { host: "smtp.example.com", port: 465, secure: true, username: "mail@example.com", password: "secret" },
}

function folder(path: string, specialUse?: string, flags: string[] = []): ListResponse {
  return { path, name: path, specialUse, flags: new Set(flags), delimiter: "/", listed: true } as ListResponse
}

describe("folder mapping", () => {
  it("recognizes server flags and common localized names", () => {
    const result = mapFolders([
      folder("INBOX", "\\Inbox"),
      folder("Wysłane"),
      folder("Kosz"),
      folder("Ukryty", undefined, ["\\Noselect"]),
    ], config)
    expect(result.map((item) => [item.path, item.specialUse])).toEqual([
      ["INBOX", "inbox"],
      ["Wysłane", "sent"],
      ["Kosz", "trash"],
    ])
  })
})
