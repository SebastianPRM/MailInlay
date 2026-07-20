import { describe, expect, it } from "vitest"
import { sanitizeIncomingHtml, sanitizeOutgoingHtml } from "../src/server/sanitizer"
import { resolveInlineImages } from "../src/react/utils"

describe("mail HTML sanitizer", () => {
  it("removes executable markup and blocks remote image loading", () => {
    const result = sanitizeIncomingHtml('<p onclick="alert(1)">Hej</p><script>alert(1)</script><img src="https://tracker.example/pixel" onerror="alert(1)">')
    expect(result.html).not.toContain("script")
    expect(result.html).not.toContain("onclick")
    expect(result.html).not.toContain("onerror")
    expect(result.html).not.toContain(' src="https://')
    expect(result.html).toContain('data-mi-src="https://tracker.example/pixel"')
    expect(result.hasRemoteImages).toBe(true)
  })

  it("does not allow images in outgoing editor HTML", () => {
    const html = sanitizeOutgoingHtml('<p>Cześć</p><img src="https://example.com/a.png"><a href="javascript:alert(1)">link</a>')
    expect(html).toBe('<p>Cześć</p><a target="_blank" rel="noopener noreferrer">link</a>')
  })

  it("does not trust a sender-provided image placeholder", () => {
    const result = sanitizeIncomingHtml('<img data-mi-src="javascript:alert(1)">')
    expect(result.html).not.toContain("data-mi-src")
    expect(result.hasRemoteImages).toBe(false)
  })

  it("keeps inline cid images as neutral markers without counting them as remote", () => {
    const result = sanitizeIncomingHtml('<img src="cid:<logo@example>" alt="Logo"><img data-mi-cid="spoofed">')
    expect(result.html).toContain('data-mi-cid="logo@example"')
    expect(result.html).not.toContain("spoofed")
    expect(result.hasRemoteImages).toBe(false)
  })

  it("resolves cid markers only to matching downloadable attachments", () => {
    const html = '<img data-mi-cid="logo@example" alt="Logo"><img data-mi-cid="missing@example" alt="Brak">'
    const attachment = {
      attachmentId: "0",
      filename: "logo.png",
      contentType: "image/png",
      size: 100,
      inline: true,
      downloadable: true,
      contentId: "logo@example",
    }
    const resolved = resolveInlineImages(html, [attachment], (attachmentId) => `/api/admin/mail/att/${attachmentId}`)
    expect(resolved).toContain('src="/api/admin/mail/att/0"')
    expect(resolved).toContain('data-mi-cid="missing@example"')
  })
})
