import sanitizeHtml from "sanitize-html"

const commonAllowedTags = [
  "p", "br", "div", "span", "strong", "b", "em", "i", "u", "s", "blockquote",
  "ul", "ol", "li", "a", "pre", "code", "hr", "h1", "h2", "h3", "h4", "h5", "h6",
]

export function sanitizeIncomingHtml(input: string): { html: string; hasRemoteImages: boolean } {
  const html = sanitizeHtml(input, {
    allowedTags: [...commonAllowedTags, "img"],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["alt", "title", "width", "height", "data-mi-src"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    disallowedTagsMode: "discard",
    transformTags: {
      a: (_tagName, attribs) => ({
        tagName: "a",
        attribs: { ...attribs, target: "_blank", rel: "noopener noreferrer" },
      }),
      img: (_tagName, attribs) => {
        const next = { ...attribs }
        const src = typeof next.src === "string" ? next.src.trim() : ""
        delete next.src
        delete next.srcset
        delete next["data-mi-src"]
        if (/^https?:\/\//i.test(src)) next["data-mi-src"] = src
        return { tagName: "img", attribs: next }
      },
    },
  })

  return { html, hasRemoteImages: html.includes("data-mi-src=") }
}

export function sanitizeOutgoingHtml(input: string): string {
  return sanitizeHtml(input, {
    allowedTags: commonAllowedTags,
    allowedAttributes: { a: ["href", "title", "target", "rel"] },
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    disallowedTagsMode: "discard",
    transformTags: {
      a: (_tagName, attribs) => ({
        tagName: "a",
        attribs: { ...attribs, target: "_blank", rel: "noopener noreferrer" },
      }),
    },
  })
}

export function stripHtml(input: string): string {
  return sanitizeHtml(input, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim()
}
