import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const css = readFileSync(new URL("../src/styles/mailinlay.css", import.meta.url), "utf8")

describe("responsive MailPanel layout", () => {
  it("keeps panes shrinkable and provides compact and drawer breakpoints", () => {
    expect(css).toMatch(/\.mail-inlay\s*\{[\s\S]*?flex:\s*1;[\s\S]*?min-height:\s*0;/)
    expect(css).toMatch(/\.mail-folders-pane,[\s\S]*?min-width:\s*0;[\s\S]*?min-height:\s*0;/)
    expect(css).toContain("@container mail (max-width: 1120px) and (min-width: 761px)")
    expect(css).toContain("grid-template-columns: 62px 320px minmax(0, 1fr)")
    expect(css).toContain("@container mail (max-width: 760px)")
    expect(css).toMatch(/@container mail \(max-width: 760px\)[\s\S]*?\.mail-folders-pane\s*\{\s*display:\s*none;/)
    expect(css).toMatch(/@container mail \(max-width: 760px\)[\s\S]*?\.mail-drawer\s*\{\s*display:\s*block;/)
  })
})
