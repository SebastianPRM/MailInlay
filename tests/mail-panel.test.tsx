// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { MailPanel } from "../src/react/MailPanel"

const foldersResponse = {
  mailbox: { id: "main", email: "mail@example.com", displayName: "Mail" },
  folders: [{ path: "INBOX", name: "Odebrane", specialUse: "inbox", unread: 2, total: 4 }],
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
    const pathname = new URL(String(input)).pathname
    const body = pathname.endsWith("/folders")
      ? foldersResponse
      : { items: [], page: 1, limit: 50, hasMore: false, total: 0 }
    return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } })
  }))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("MailPanel integration controls", () => {
  it("supports uncontrolled folder collapsing", async () => {
    const onChange = vi.fn()
    const { container } = render(<MailPanel apiBase="/api/mail" mailboxId="main" onFoldersCollapsedChange={onChange} />)
    await waitFor(() => expect(screen.getByRole("button", { name: "Zwiń panel folderów" })).toBeTruthy())

    fireEvent.click(screen.getByRole("button", { name: "Zwiń panel folderów" }))
    expect(container.querySelector(".mail-inlay")?.classList.contains("is-folders-collapsed")).toBe(true)
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it("keeps controlled collapse state owned by the host", async () => {
    const onChange = vi.fn()
    const { container } = render(<MailPanel apiBase="/api/mail" mailboxId="main" foldersCollapsed onFoldersCollapsedChange={onChange} />)
    await waitFor(() => expect(screen.getByRole("button", { name: "Rozwiń panel folderów" })).toBeTruthy())

    fireEvent.click(screen.getByRole("button", { name: "Rozwiń panel folderów" }))
    expect(onChange).toHaveBeenCalledWith(false)
    expect(container.querySelector(".mail-inlay")?.classList.contains("is-folders-collapsed")).toBe(true)
  })

  it("only renders an active settings button when the callback exists", async () => {
    const onOpenSettings = vi.fn()
    const { rerender } = render(<MailPanel apiBase="/api/mail" mailboxId="main" />)
    expect(screen.queryByRole("button", { name: "Otwórz ustawienia poczty" })).toBeNull()

    rerender(<MailPanel apiBase="/api/mail" mailboxId="main" onOpenSettings={onOpenSettings} />)
    const settings = screen.getByRole("button", { name: "Otwórz ustawienia poczty" })
    expect(settings.hasAttribute("disabled")).toBe(false)
    fireEvent.click(settings)
    expect(onOpenSettings).toHaveBeenCalledOnce()

    rerender(<MailPanel apiBase="/api/mail" mailboxId="main" onOpenSettings={onOpenSettings} showSettings={false} />)
    expect(screen.queryByRole("button", { name: "Otwórz ustawienia poczty" })).toBeNull()
  })
})
