import { describe, expect, it } from "vitest"
import {
  decryptMailboxConfig,
  encryptMailboxConfig,
  relayAuthToken,
  verifyRelayAuthHeader,
} from "../src/server/relay-crypto"
import { createMailInlayRelay } from "../src/next/relay"
import type { MailboxConfig } from "../src/shared/types"

const secret = "0123456789abcdef0123456789abcdef"

const mailbox: MailboxConfig = {
  id: "main",
  email: "mail@example.com",
  imap: { host: "imap.example.com", port: 993, secure: true, username: "mail@example.com", password: "top-secret" },
  smtp: { host: "smtp.example.com", port: 465, secure: true, username: "mail@example.com", password: "top-secret" },
}

describe("relay mailbox encryption", () => {
  it("round-trips a mailbox configuration and hides the password in transit", () => {
    const blob = encryptMailboxConfig(mailbox, secret)
    expect(blob).not.toContain("top-secret")
    expect(blob).not.toContain("mail@example.com")
    expect(decryptMailboxConfig(blob, secret)).toEqual(mailbox)
  })

  it("rejects a tampered payload", () => {
    const blob = encryptMailboxConfig(mailbox, secret)
    const tampered = blob.slice(0, -2) + (blob.endsWith("A") ? "BB" : "AA")
    expect(() => decryptMailboxConfig(tampered, secret)).toThrowError(
      expect.objectContaining({ code: "UNAUTHORIZED" }),
    )
  })

  it("rejects a payload encrypted with a different secret", () => {
    const blob = encryptMailboxConfig(mailbox, "another-secret-another-secret-32ch")
    expect(() => decryptMailboxConfig(blob, secret)).toThrowError(
      expect.objectContaining({ code: "UNAUTHORIZED" }),
    )
  })

  it("verifies bearer tokens in constant time and never accepts the raw secret", () => {
    expect(verifyRelayAuthHeader(`Bearer ${relayAuthToken(secret)}`, secret)).toBe(true)
    expect(verifyRelayAuthHeader(`Bearer ${secret}`, secret)).toBe(false)
    expect(verifyRelayAuthHeader(null, secret)).toBe(false)
    expect(verifyRelayAuthHeader("Bearer ", secret)).toBe(false)
  })

  it("refuses to start a relay with a short secret", () => {
    expect(() => createMailInlayRelay({ secret: "too-short" })).toThrowError(/32 characters/)
  })
})
