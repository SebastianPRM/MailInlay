// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { MessageList } from "../src/react/MessageList"

const messages = [
  { messageKey: "one", from: [{ address: "one@example.com" }], subject: "Pierwsza", date: "2026-07-23T10:00:00Z", seen: false, flagged: false, hasAttachments: false },
  { messageKey: "two", from: [{ address: "two@example.com" }], subject: "Druga", date: "2026-07-23T09:00:00Z", seen: true, flagged: false, hasAttachments: false },
]

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
    unreadOnly: false,
    loading: false,
    loadingMore: false,
    hasMore: false,
    onSearchValue: vi.fn(),
    onSearch: vi.fn(),
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
