import type { EmailAddress, MessageAttachment } from "../shared/types"

export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ")
}

export function initials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts.at(-1)?.[0] ?? ""}`.toUpperCase()
}

export function displayAddress(addresses: EmailAddress[]): string {
  const first = addresses[0]
  return first?.name || first?.address || "Nieznany nadawca"
}

export function formatListDate(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })
  }
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return "wczoraj"
  return date.toLocaleDateString("pl-PL", { day: "numeric", month: "short" })
}

export function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleString("pl-PL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

function decodeEntities(value: string): string {
  return value.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
}

// Replaces sanitized `data-mi-cid` markers with same-origin attachment URLs so
// inline (cid:) images render. Operates on sanitizer output, where attribute
// values are entity-escaped, so the injected src cannot break out of its quotes.
export function resolveInlineImages(
  html: string,
  attachments: MessageAttachment[],
  attachmentUrl: (attachmentId: string) => string,
): string {
  return html.replace(/data-mi-cid="([^"]*)"/g, (match, escapedCid: string) => {
    const cid = decodeEntities(escapedCid)
    const attachment = attachments.find((item) => item.contentId === cid && item.downloadable)
    if (!attachment) return match
    return `src="${escapeHtml(attachmentUrl(attachment.attachmentId))}"`
  })
}
