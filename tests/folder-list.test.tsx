// @vitest-environment jsdom

import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { FolderList } from "../src/react/FolderList"

describe("FolderList", () => {
  it("shows only the Inbox unread count", () => {
    render(
      <FolderList
        folders={[
          { path: "INBOX", name: "INBOX", specialUse: "inbox", unread: 3, total: 12 },
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
    expect(screen.getByRole("button", { name: "Sent" }).querySelector("b")).toBeNull()
    expect(screen.getByRole("button", { name: "Trash" }).querySelector("b")).toBeNull()
    expect(screen.getByRole("button", { name: "Projects" }).querySelector("b")).toBeNull()
  })
})
