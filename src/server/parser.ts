import PostalMime, { type Address, type Attachment, type Email } from "postal-mime"
import type { EmailAddress } from "../shared/types"

export type ParsedEmail = Email

export async function parseMessageSource(source: Buffer): Promise<ParsedEmail> {
  return PostalMime.parse(source, {
    attachmentEncoding: "arraybuffer",
    maxNestingDepth: 20,
    maxHeadersSize: 1024 * 1024,
  })
}

export function mapPostalAddresses(addresses?: Address[]): EmailAddress[] {
  const result: EmailAddress[] = []
  for (const entry of addresses ?? []) {
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

export function attachmentBuffer(attachment: Attachment): Buffer {
  if (typeof attachment.content === "string") return Buffer.from(attachment.content, "utf8")
  if (attachment.content instanceof ArrayBuffer) return Buffer.from(attachment.content)
  return Buffer.from(attachment.content)
}

export function parseReferences(value?: string): string[] {
  if (!value) return []
  return value.match(/<[^>]+>/g) ?? value.split(/\s+/).filter(Boolean)
}
