import { describe, expect, it } from "vitest"
import { sanitizeIncomingHtml, sanitizeOutgoingHtml } from "../src/server/sanitizer"
import { resolveInlineImages } from "../src/react/utils"

describe("mail HTML sanitizer", () => {
  it("removes executable markup and blocks remote image loading", () => {
    const result = sanitizeIncomingHtml('<p onclick="alert(1)">Hej</p><script>alert(1)</script><form action="https://evil.example"><input name="token"><button>Wyślij</button></form><iframe src="https://evil.example"></iframe><object data="https://evil.example"></object><img src="https://tracker.example/pixel" onerror="alert(1)">')
    expect(result.html).not.toContain("script")
    expect(result.html).not.toContain("<form")
    expect(result.html).not.toContain("<input")
    expect(result.html).not.toContain("<iframe")
    expect(result.html).not.toContain("<object")
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

  it("keeps email tables, safe layout attributes and safe inline styles", () => {
    const result = sanitizeIncomingHtml(`
      <table class="email-card" dir="rtl" lang="ar" width="420" border="0" cellpadding="12" cellspacing="0" role="presentation" bgcolor="#ffffff" style="border-collapse: collapse; color: #123456; font-family: Arial, sans-serif" onclick="alert(1)">
        <thead><tr><th colspan="2" scope="colgroup" align="left" valign="top">Nagłówek</th></tr></thead>
        <tbody><tr><td rowspan="2" bgcolor="#eeeeee" style="padding: 16px; font-size: 14px">Treść</td><td width="50%" style="width: 50%">Druga kolumna</td></tr></tbody>
        <tfoot><tr><td colspan="2">Stopka</td></tr></tfoot>
      </table>
    `)

    expect(result.html).toContain("<table")
    expect(result.html).toContain("<thead>")
    expect(result.html).toContain("<tbody>")
    expect(result.html).toContain("<tfoot>")
    expect(result.html).toContain('width="420"')
    expect(result.html).toContain('cellpadding="12"')
    expect(result.html).toContain('cellspacing="0"')
    expect(result.html).toContain('role="presentation"')
    expect(result.html).toContain('class="email-card"')
    expect(result.html).toContain('dir="rtl"')
    expect(result.html).toContain('lang="ar"')
    expect(result.html).toContain('scope="colgroup"')
    expect(result.html).toContain('colspan="2"')
    expect(result.html).toContain('rowspan="2"')
    expect(result.html).toContain('width="50%" style="width:50%"')
    expect(result.html).toContain("border-collapse:collapse")
    expect(result.html).toContain("font-family:Arial, sans-serif")
    expect(result.html).not.toContain("onclick")
  })

  it("makes fixed 600–640 px tables and images responsive without rigid cells", () => {
    const result = sanitizeIncomingHtml(`
      <table width="640" style="width: 640px; min-width: 640px">
        <tbody><tr><td width="320" style="width: 320px; min-width: 320px">Treść</td></tr></tbody>
      </table>
      <img src="https://images.example/newsletter.png" width="600" height="240" style="width: 600px; min-width: 600px">
    `)

    expect(result.html).toContain('<table width="100%" style="width:100%;max-width:100%">')
    expect(result.html).toMatch(/<td(?: style="")?>Treść<\/td>/)
    expect(result.html).toContain('data-mi-src="https://images.example/newsletter.png"')
    expect(result.html).toContain('width="600"')
    expect(result.html).toContain('style="width:100%;max-width:600px;height:auto"')
    expect(result.html).not.toContain('height="240"')
    expect(result.html).not.toContain("min-width")
    expect(result.hasRemoteImages).toBe(true)
  })

  it("removes CSS resource loading and executable legacy CSS", () => {
    const result = sanitizeIncomingHtml(`
      <div style="color: #123456; background-image: url(https://tracker.example/a.png); width: expression(alert(1)); behavior: url(evil.htc); -moz-binding: url(evil.xml#x); font-size: 14px; @import: https://evil.example/style.css">
        Bezpieczna treść
      </div>
    `)

    expect(result.html).toContain("color:#123456")
    expect(result.html).toContain("font-size:14px")
    expect(result.html).not.toMatch(/url\s*\(/i)
    expect(result.html).not.toMatch(/expression\s*\(/i)
    expect(result.html).not.toMatch(/@import/i)
    expect(result.html).not.toMatch(/behavior/i)
    expect(result.html).not.toMatch(/-moz-binding/i)
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
