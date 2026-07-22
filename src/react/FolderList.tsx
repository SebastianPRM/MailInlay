"use client"

import { Archive, File, Inbox, PenSquare, Send, Settings, ShieldAlert, Trash2 } from "lucide-react"
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
  drawer?: boolean
}

export function FolderList({ folders, mailbox, activeFolder, onSelect, onCompose, drawer = false }: Props) {
  return (
    <aside className={cn("mail-folder-sidebar", drawer && "is-drawer") }>
      <div className="mail-account">
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

      <div className="mail-folder-footer">
        {mailbox?.storageUsedPercent !== undefined && (
          <div className="mail-storage">
            <span><span>Wykorzystano</span><b>{mailbox.storageUsedPercent}%</b></span>
            <i><span style={{ width: `${mailbox.storageUsedPercent}%` }} /></i>
          </div>
        )}
        <button type="button" className="mail-settings-button" title="Konfiguracją zarządza panel nadrzędny" disabled>
          <Settings aria-hidden="true" />
          <span>Ustawienia w panelu</span>
        </button>
      </div>
    </aside>
  )
}
