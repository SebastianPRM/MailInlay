import { describe, expect, it } from "vitest"
import { MailInlayError } from "../src/shared/errors"
import { decodeMessageKey, encodeMessageKey } from "../src/server/message-key"

describe("message keys", () => {
  it("round-trips a server-side message locator", () => {
    const payload = { folder: "INBOX/Obsługa", uidValidity: "123456", uid: 42 }
    expect(decodeMessageKey(encodeMessageKey(payload))).toEqual(payload)
  })

  it("rejects malformed and incomplete locators", () => {
    expect(() => decodeMessageKey("not-a-key")).toThrow(MailInlayError)
    expect(() => decodeMessageKey(Buffer.from(JSON.stringify({ folder: "INBOX", uid: 1 })).toString("base64url"))).toThrow(MailInlayError)
  })
})
