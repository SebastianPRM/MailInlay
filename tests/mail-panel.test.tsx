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

  it("moves and deletes selected messages with bulk actions", async () => {
    const mutations: Array<{ pathname: string; body: unknown }> = []
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const pathname = new URL(String(input)).pathname
      if (pathname.endsWith("/folders")) {
        return Response.json({
          ...foldersResponse,
          folders: [
            ...foldersResponse.folders,
            { path: "Archive", name: "Archiwum", specialUse: "archive", unread: 0, total: 0 },
            { path: "Trash", name: "Kosz", specialUse: "trash", unread: 0, total: 0 },
          ],
        })
      }
      if (pathname.endsWith("/messages")) {
        return Response.json({
          items: [
            { messageKey: "one", from: [{ address: "one@example.com" }], subject: "Pierwsza", date: "2026-07-23T10:00:00Z", seen: false, flagged: false, hasAttachments: false },
            { messageKey: "two", from: [{ address: "two@example.com" }], subject: "Druga", date: "2026-07-23T09:00:00Z", seen: true, flagged: false, hasAttachments: false },
          ],
          page: 1,
          limit: 30,
          hasMore: false,
          total: 2,
        })
      }
      mutations.push({ pathname, body: init?.body ? JSON.parse(String(init.body)) : undefined })
      return Response.json({ ok: true })
    }))

    render(<MailPanel apiBase="/api/mail" mailboxId="main" />)
    const first = await screen.findByRole("checkbox", { name: "Zaznacz wiadomość: Pierwsza" })
    fireEvent.click(first)
    fireEvent.change(screen.getByRole("combobox", { name: "Folder docelowy" }), { target: { value: "Archive" } })
    fireEvent.click(screen.getByRole("button", { name: "Przenieś zaznaczone wiadomości" }))

    await waitFor(() => expect(mutations).toContainEqual({
      pathname: "/api/mail/messages/one/move",
      body: { destinationFolder: "Archive" },
    }))
    await waitFor(() => expect(screen.queryByRole("checkbox", { name: "Zaznacz wiadomość: Pierwsza" })).toBeNull())

    fireEvent.click(screen.getByRole("checkbox", { name: "Zaznacz wiadomość: Druga" }))
    fireEvent.click(screen.getByRole("button", { name: "Usuń zaznaczone wiadomości" }))

    await waitFor(() => expect(mutations).toContainEqual({
      pathname: "/api/mail/messages/two/move",
      body: { destinationFolder: "Trash" },
    }))
    await waitFor(() => expect(screen.queryByRole("checkbox", { name: "Zaznacz wiadomość: Druga" })).toBeNull())
  })
})
