import { createCipheriv, createDecipheriv, hkdfSync, randomBytes, timingSafeEqual } from "node:crypto"
import { z } from "zod"
import { errors } from "../shared/errors"
import type { MailboxConfig } from "../shared/types"

export const MIN_RELAY_SECRET_LENGTH = 32

const endpointSchema = z.object({
  host: z.string().min(1).max(255),
  port: z.number().int().min(1).max(65535),
  secure: z.boolean(),
  username: z.string().min(1).max(320),
  password: z.string().min(1).max(1024),
})

const mailboxConfigSchema = z.object({
  id: z.string().min(1).max(128),
  email: z.email().max(320),
  displayName: z.string().max(200).optional(),
  imap: endpointSchema,
  smtp: endpointSchema,
  signatureHtml: z.string().max(20_000).optional(),
  folders: z
    .object({
      sent: z.string().min(1).max(1024).optional(),
      trash: z.string().min(1).max(1024).optional(),
      spam: z.string().min(1).max(1024).optional(),
    })
    .optional(),
  saveToSent: z.boolean().optional(),
})

export function assertRelaySecret(secret: string) {
  if (secret.length < MIN_RELAY_SECRET_LENGTH) {
    throw new Error(`MailInlay relay secret must be at least ${MIN_RELAY_SECRET_LENGTH} characters long.`)
  }
}

function deriveKey(secret: string, purpose: "auth" | "box"): Buffer {
  return Buffer.from(hkdfSync("sha256", secret, "mailinlay-relay", purpose, 32))
}

export function relayAuthToken(secret: string): string {
  return deriveKey(secret, "auth").toString("base64url")
}

export function verifyRelayAuthHeader(header: string | null, secret: string): boolean {
  if (!header?.startsWith("Bearer ")) return false
  const presented = Buffer.from(header.slice("Bearer ".length))
  const expected = Buffer.from(relayAuthToken(secret))
  return presented.length === expected.length && timingSafeEqual(presented, expected)
}

export function encryptMailboxConfig(config: MailboxConfig, secret: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", deriveKey(secret, "box"), iv)
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(config), "utf8"), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url")
}

export function decryptMailboxConfig(blob: string, secret: string): MailboxConfig {
  try {
    const raw = Buffer.from(blob, "base64url")
    const decipher = createDecipheriv("aes-256-gcm", deriveKey(secret, "box"), raw.subarray(0, 12))
    decipher.setAuthTag(raw.subarray(12, 28))
    const plain = Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()])
    return mailboxConfigSchema.parse(JSON.parse(plain.toString("utf8")))
  } catch {
    throw errors.unauthorized()
  }
}
