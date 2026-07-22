// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { FolderList } from "../src/react/FolderList"

describe("FolderList", () => {
  it("shows only the Inbox unread count", () => {
    render(
      <FolderList
        folders={[
          { path: "INBOX", name: "INBOX", specialUse: "inbox", unread: 3, total: 12 },
          { path: "Inbox zero", name: "Inbox zero", specialUse: "inbox", unread: 0, total: 2 },
          { path: "Sent", name: "Sent", specialUse: "sent", unread: 1, total: 8 },
          { path: "Trash", name: "Trash", specialUse: "trash", unread: 2, total: 6 },
          { path: "Projects", name: "Projects", unread: 4, total: 10 },
        ]}
        mailbox={null}
        activeFolder="INBOX"
        onSelect={vi.fn()}
        onCompose={vi.fn()}
      />,
    )

    expect(screen.getByRole("button", { name: "INBOX" }).querySelector("b")?.textContent).toBe("3")
    expect(screen.getByRole("button", { name: "Inbox zero" }).querySelector("b")).toBeNull()
    expect(screen.getByRole("button", { name: "Sent" }).querySelector("b")).toBeNull()
    expect(screen.getByRole("button", { name: "Trash" }).querySelector("b")).toBeNull()
    expect(screen.getByRole("button", { name: "Projects" }).querySelector("b")).toBeNull()
  })

  it("exposes an accessible collapse control outside the mobile drawer", () => {
    const onCollapsedChange = vi.fn()
    const { rerender } = render(
      <FolderList folders={[]} mailbox={null} activeFolder={null} onSelect={vi.fn()} onCompose={vi.fn()} collapsed={false} onCollapsedChange={onCollapsedChange} />,
    )

    const collapse = screen.getByRole("button", { name: "Zwiń panel folderów" })
    expect(collapse.getAttribute("aria-expanded")).toBe("true")
    fireEvent.click(collapse)
    expect(onCollapsedChange).toHaveBeenCalledWith(true)

    rerender(<FolderList folders={[]} mailbox={null} activeFolder={null} onSelect={vi.fn()} onCompose={vi.fn()} collapsed onCollapsedChange={onCollapsedChange} />)
    expect(screen.getByRole("button", { name: "Rozwiń panel folderów" }).getAttribute("aria-expanded")).toBe("false")

    rerender(<FolderList folders={[]} mailbox={null} activeFolder={null} onSelect={vi.fn()} onCompose={vi.fn()} drawer />)
    expect(screen.queryByRole("button", { name: /panel folderów/ })).toBeNull()
  })
})
