import sanitizeHtml from "sanitize-html"

const commonAllowedTags = [
  "p", "br", "div", "span", "strong", "b", "em", "i", "u", "s", "blockquote",
  "ul", "ol", "li", "a", "pre", "code", "hr", "h1", "h2", "h3", "h4", "h5", "h6",
]

const emailTableTags = [
  "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption", "colgroup", "col",
]

const incomingAllowedTags = [...commonAllowedTags, ...emailTableTags, "img"]
const responsiveWidthThreshold = 480
const forbiddenCss = /(?:url\s*\(|expression\s*\(|@import\b|behavior\b|-moz-binding)/i
const safeCssValue = /^(?![\s\S]*(?:url\s*\(|expression\s*\(|@import\b|behavior\b|-moz-binding))[\s\S]*$/i
const fixedWidth = /^\s*(\d+(?:\.\d+)?)(?:px)?\s*(?:!important)?\s*$/i
const percentageWidth = /^\s*\d+(?:\.\d+)?%\s*(?:!important)?\s*$/i
const safeColor = /^(?:#[\da-f]{3,8}|(?:rgb|hsl)a?\([^)]*\)|transparent|[a-z]+)\s*(?:!important)?$/i

const safeStyleProperties = [
  "display", "width", "max-width", "height", "min-height", "max-height",
  "margin", "margin-top", "margin-right", "margin-bottom", "margin-left",
  "padding", "padding-top", "padding-right", "padding-bottom", "padding-left",
  "border", "border-top", "border-right", "border-bottom", "border-left",
  "border-width", "border-style", "border-color", "border-radius", "border-collapse", "border-spacing",
  "background-color", "color", "font", "font-family", "font-size", "font-style", "font-weight",
  "line-height", "letter-spacing", "text-align", "text-decoration", "text-transform", "text-indent",
  "white-space", "vertical-align", "table-layout", "overflow", "overflow-x", "overflow-y",
  "overflow-wrap", "word-break", "word-spacing", "word-wrap", "direction", "opacity", "box-sizing",
  "float", "clear",
]

const safeStylePropertySet = new Set(safeStyleProperties)
const allowedStyles = {
  "*": Object.fromEntries(safeStyleProperties.map((property) => [property, [safeCssValue]])),
}

function styleValue(style: string | undefined, property: string): string | undefined {
  if (!style) return undefined
  for (const declaration of style.replace(/\/\*[\s\S]*?\*\//g, "").split(";")) {
    const separator = declaration.indexOf(":")
    if (separator < 0) continue
    if (declaration.slice(0, separator).trim().toLowerCase() === property) {
      return declaration.slice(separator + 1).trim()
    }
  }
  return undefined
}

function numericFixedWidth(value: string | undefined): number | undefined {
  const match = value?.match(fixedWidth)
  return match ? Number(match[1]) : undefined
}

function cleanInlineStyle(style: string | undefined, removeFixedCellWidth = false, removeWidth = false): string | undefined {
  if (!style) return undefined
  const cleaned: string[] = []

  for (const declaration of style.replace(/\/\*[\s\S]*?\*\//g, "").split(";")) {
    const separator = declaration.indexOf(":")
    if (separator < 0) continue
    let property = declaration.slice(0, separator).trim().toLowerCase()
    const value = declaration.slice(separator + 1).trim()
    if (!property || !value || forbiddenCss.test(`${property}:${value}`)) continue
    if (property === "min-width" || (property === "width" && removeWidth)) continue
    if (property === "width" && removeFixedCellWidth && !percentageWidth.test(value)) continue

    if (property === "background") {
      if (!safeColor.test(value)) continue
      property = "background-color"
    }

    if (!safeStylePropertySet.has(property) || !safeCssValue.test(value)) continue
    cleaned.push(`${property}: ${value}`)
  }

  return cleaned.length ? cleaned.join("; ") : undefined
}

function appendStyle(style: string | undefined, ...declarations: string[]): string {
  return [...(style ? [style] : []), ...declarations].join("; ")
}

function transformIncomingTag(tagName: string, attribs: Record<string, string>) {
  const tag = tagName.toLowerCase()
  const next = { ...attribs }
  const isCell = tag === "td" || tag === "th"
  const originalWidth = numericFixedWidth(next.width) ?? numericFixedWidth(styleValue(next.style, "width"))
  const cleanedStyle = cleanInlineStyle(next.style, isCell)
  if (cleanedStyle) next.style = cleanedStyle
  else delete next.style

  if (isCell && next.width && !percentageWidth.test(next.width)) delete next.width

  if (tag === "table" && originalWidth !== undefined && originalWidth >= responsiveWidthThreshold) {
    next.width = "100%"
    next.style = appendStyle(cleanInlineStyle(next.style, false, true), "width: 100%", "max-width: 100%")
  }

  if (tag === "a") {
    next.target = "_blank"
    next.rel = "noopener noreferrer"
  }

  if (tag === "img") {
    const src = typeof next.src === "string" ? next.src.trim() : ""
    delete next.src
    delete next.srcset
    delete next["data-mi-src"]
    delete next["data-mi-cid"]
    if (/^https?:\/\//i.test(src)) next["data-mi-src"] = src
    const cid = src.match(/^cid:(.+)$/i)
    if (cid) next["data-mi-cid"] = normalizeContentId(cid[1])

    if (originalWidth !== undefined && originalWidth >= responsiveWidthThreshold) {
      next.style = appendStyle(cleanInlineStyle(next.style, false, true), "width: 100%", `max-width: ${originalWidth}px`, "height: auto")
      delete next.height
    }
  }

  return { tagName: tag, attribs: next }
}

export function normalizeContentId(value: string): string {
  return value.trim().replace(/^</, "").replace(/>$/, "")
}

export function sanitizeIncomingHtml(input: string): { html: string; hasRemoteImages: boolean } {
  const html = sanitizeHtml(input, {
    allowedTags: incomingAllowedTags,
    allowedAttributes: {
      "*": ["style", "width", "height", "align", "valign", "bgcolor", "role"],
      a: ["href", "title", "target", "rel", "style"],
      table: ["width", "height", "align", "valign", "bgcolor", "border", "cellpadding", "cellspacing", "role", "style"],
      th: ["width", "height", "align", "valign", "bgcolor", "colspan", "rowspan", "role", "style"],
      td: ["width", "height", "align", "valign", "bgcolor", "colspan", "rowspan", "role", "style"],
      colgroup: ["span", "width", "align", "valign", "style"],
      col: ["span", "width", "align", "valign", "style"],
      img: ["alt", "title", "width", "height", "align", "style", "data-mi-src", "data-mi-cid"],
    },
    allowedStyles,
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    disallowedTagsMode: "discard",
    transformTags: Object.fromEntries(incomingAllowedTags.map((tag) => [tag, transformIncomingTag])),
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
