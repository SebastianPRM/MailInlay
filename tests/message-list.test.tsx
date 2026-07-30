// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { MessageList } from "../src/react/MessageList"

const messages = [
  { messageKey: "one", from: [{ address: "one@example.com" }], subject: "Pierwsza", date: "2026-07-23T10:00:00Z", seen: false, flagged: false, hasAttachments: false },
  { messageKey: "two", from: [{ address: "two@example.com" }], subject: "Druga", date: "2026-07-23T09:00:00Z", seen: true, flagged: false, hasAttachments: false },
]

afterEach(cleanup)

function renderList(overrides: Partial<Parameters<typeof MessageList>[0]> = {}) {
  const props: Parameters<typeof MessageList>[0] = {
    title: "Odebrane",
    messages,
    selectedKey: null,
    checkedKeys: new Set(),
    folders: [
      { path: "INBOX", name: "Odebrane", specialUse: "inbox" },
      { path: "Archive", name: "Archiwum", specialUse: "archive" },
    ],
    activeFolder: "INBOX",
    bulkDestination: "",
    bulkBusy: false,
    searchValue: "",
    searchActive: false,
    searchScope: "folder",
    searchIn: "headers",
    unreadOnly: false,
    total: messages.length,
    loading: false,
    loadingMore: false,
    hasMore: false,
    onSearchValue: vi.fn(),
    onSearch: vi.fn(),
    onSearchOptions: vi.fn(),
    onUnreadOnly: vi.fn(),
    onSelect: vi.fn(),
    onToggleChecked: vi.fn(),
    onToggleAll: vi.fn(),
    onClearChecked: vi.fn(),
    onBulkDestination: vi.fn(),
    onBulkMove: vi.fn(),
    onBulkDelete: vi.fn(),
    onToggleStar: vi.fn(),
    onLoadMore: vi.fn(),
    ...overrides,
  }
  render(<MessageList {...props} />)
  return props
}

describe("MessageList bulk selection", () => {
  it("selects individual messages and all loaded messages", () => {
    const props = renderList()
    fireEvent.click(screen.getByRole("checkbox", { name: "Zaznacz wiadomość: Pierwsza" }))
    expect(props.onToggleChecked).toHaveBeenCalledWith("one", true)

    fireEvent.click(screen.getByRole("checkbox", { name: "Zaznacz wszystkie wiadomości" }))
    expect(props.onToggleAll).toHaveBeenCalledWith(true)
  })

  it("shows move, delete and clear controls for a selection", () => {
    const props = renderList({ checkedKeys: new Set(["one"]), bulkDestination: "Archive" })
    expect(screen.getByText("1 zaznaczono")).toBeTruthy()
    expect(screen.queryByRole("option", { name: "Odebrane" })).toBeNull()
    expect(screen.getByRole("option", { name: "Archiwum" })).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Przenieś zaznaczone wiadomości" }))
    fireEvent.click(screen.getByRole("button", { name: "Usuń zaznaczone wiadomości" }))
    fireEvent.click(screen.getByRole("button", { name: "Odznacz wszystkie wiadomości" }))
    expect(props.onBulkMove).toHaveBeenCalledOnce()
    expect(props.onBulkDelete).toHaveBeenCalledOnce()
    expect(props.onClearChecked).toHaveBeenCalledOnce()
  })
})

describe("MessageList search options", () => {
  it("keeps unread filtering separate from search settings", () => {
    const props = renderList({ unreadOnly: true })
    expect(screen.getByRole("button", { name: "Pokaż tylko nieprzeczytane" }).getAttribute("aria-pressed")).toBe("true")
    expect(screen.getByRole("button", { name: "Nieprzeczytane" })).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Opcje" }))
    expect(screen.getByRole("dialog", { name: "Opcje wyszukiwania" })).toBeTruthy()
    expect(screen.queryByRole("radio", { name: "Nieprzeczytane" })).toBeNull()

    fireEvent.click(screen.getByRole("radio", { name: "Wszystkie foldery" }))
    fireEvent.click(screen.getByRole("radio", { name: "Także w treści" }))
    fireEvent.click(screen.getByRole("button", { name: "Zastosuj" }))
    expect(props.onSearchOptions).toHaveBeenCalledWith("all", "all")
    expect(props.onUnreadOnly).not.toHaveBeenCalled()
  })

  it("shows a folder badge for every search result", () => {
    renderList({
      searchActive: true,
      searchScope: "all",
      messages: [{ ...messages[0], folderPath: "Archive" }],
      total: 1,
    })
    expect(document.querySelector(".message-row__folder")?.textContent).toBe("Archiwum")
    expect(screen.getByText("1 wynik")).toBeTruthy()
  })
})
