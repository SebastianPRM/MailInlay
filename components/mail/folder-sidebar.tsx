"use client"

import {
  Archive,
  ChevronDown,
  File,
  Inbox,
  PenSquare,
  Send,
  Settings,
  ShieldAlert,
  Star,
  Trash2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { FolderId, MailFolder } from "@/lib/mail-data"

const iconMap = {
  inbox: Inbox,
  star: Star,
  send: Send,
  file: File,
  archive: Archive,
  "shield-alert": ShieldAlert,
  trash: Trash2,
}

type Props = {
  folders: MailFolder[]
  activeFolder: FolderId
  onSelectFolder: (id: FolderId) => void
  onCompose: () => void
  usedStorage: number
  drawer?: boolean
}

export function FolderSidebar({
  folders,
  activeFolder,
  onSelectFolder,
  onCompose,
  usedStorage,
  drawer = false,
}: Props) {
  return (
    <aside className={cn("mail-folder-sidebar", drawer && "is-drawer")}>
      <button type="button" className="mail-account">
        <span className="mail-account__avatar">SP</span>
        <span className="mail-account__copy">
          <strong>Sebastian P.</strong>
          <small>ty@firma.pl</small>
        </span>
        <ChevronDown className="mail-account__chevron" aria-hidden="true" />
      </button>

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
            const Icon = iconMap[folder.icon]
            const active = folder.id === activeFolder

            return (
              <li key={folder.id}>
                <button
                  type="button"
                  onClick={() => onSelectFolder(folder.id)}
                  aria-current={active ? "page" : undefined}
                  title={folder.name}
                  className={cn(active && "is-active")}
                >
                  <Icon aria-hidden="true" />
                  <span>{folder.name}</span>
                  {folder.count ? <b>{folder.count}</b> : null}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="mail-folder-footer">
        <div className="mail-storage">
          <span>
            <span>Wykorzystano</span>
            <b>{usedStorage}%</b>
          </span>
          <i>
            <span style={{ width: `${usedStorage}%` }} />
          </i>
        </div>
        <button type="button" className="mail-settings-button" title="Ustawienia skrzynki">
          <Settings aria-hidden="true" />
          <span>Ustawienia skrzynki</span>
        </button>
      </div>
    </aside>
  )
}
