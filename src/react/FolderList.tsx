"use client"

import { Archive, File, Inbox, PanelLeftClose, PanelLeftOpen, PenSquare, Send, ShieldAlert, Trash2 } from "lucide-react"
import type { MailFolder, MailboxPublicInfo } from "../shared/types"
import { cn, initials } from "./utils"

const icons = {
  inbox: Inbox,
  sent: Send,
  trash: Trash2,
  spam: ShieldAlert,
  drafts: File,
  archive: Archive,
}

type Props = {
  folders: MailFolder[]
  mailbox: MailboxPublicInfo | null
  activeFolder: string | null
  onSelect: (path: string) => void
  onCompose: () => void
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
  drawer?: boolean
}

export function FolderList({ folders, mailbox, activeFolder, onSelect, onCompose, collapsed = false, onCollapsedChange, drawer = false }: Props) {
  return (
    <aside className={cn("mail-folder-sidebar", collapsed && !drawer && "is-collapsed", drawer && "is-drawer") }>
      <div className="mail-account" title={mailbox?.displayName || mailbox?.email || "Skrzynka projektu"}>
        <span className="mail-account__avatar">{initials(mailbox?.displayName || mailbox?.email || "MI")}</span>
        <span className="mail-account__copy">
          <strong>{mailbox?.displayName || "Skrzynka projektu"}</strong>
          <small>{mailbox?.email || "Łączenie…"}</small>
        </span>
      </div>

      <div className="mail-compose-wrap">
        <button type="button" onClick={onCompose} className="mail-compose-button" title="Nowa wiadomość">
          <PenSquare aria-hidden="true" />
          <span>Nowa wiadomość</span>
        </button>
      </div>

      <nav className="mail-folder-nav" aria-label="Foldery poczty">
        <p>Foldery</p>
        <ul>
          {folders.map((folder) => {
            const Icon = folder.specialUse ? icons[folder.specialUse] : File
            const active = folder.path === activeFolder
            const count = folder.specialUse === "inbox" ? folder.unread : undefined
            return (
              <li key={folder.path}>
                <button
                  type="button"
                  onClick={() => onSelect(folder.path)}
                  aria-current={active ? "page" : undefined}
                  aria-label={folder.name}
                  title={folder.name}
                  className={cn(active && "is-active")}
                >
                  <Icon aria-hidden="true" />
                  <span>{folder.name}</span>
                  {count ? <b>{count}</b> : null}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {!drawer && onCollapsedChange && (
        <button
          type="button"
          className="mail-folders-collapse"
          onClick={() => onCollapsedChange(!collapsed)}
          aria-label={collapsed ? "Rozwiń panel folderów" : "Zwiń panel folderów"}
          aria-expanded={!collapsed}
          title={collapsed ? "Rozwiń panel folderów" : "Zwiń panel folderów"}
        >
          {collapsed ? <PanelLeftOpen aria-hidden="true" /> : <PanelLeftClose aria-hidden="true" />}
          <span>{collapsed ? "Rozwiń" : "Zwiń"}</span>
        </button>
      )}

      {mailbox?.storageUsedPercent !== undefined && (
        <div className="mail-folder-footer">
          <div className="mail-storage">
            <span><span>Wykorzystano</span><b>{mailbox.storageUsedPercent}%</b></span>
            <i><span style={{ width: `${mailbox.storageUsedPercent}%` }} /></i>
          </div>
        </div>
      )}
    </aside>
  )
}
