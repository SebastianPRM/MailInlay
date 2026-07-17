import type { ListResponse } from "imapflow"
import type { FolderSpecialUse, MailFolder, MailboxConfig } from "../shared/types"

function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[łŁ]/g, "l")
    .toLowerCase()
}

function specialFromServer(value?: string): FolderSpecialUse | undefined {
  switch (value?.toLowerCase()) {
    case "\\inbox": return "inbox"
    case "\\sent": return "sent"
    case "\\trash": return "trash"
    case "\\junk": return "spam"
    case "\\drafts": return "drafts"
    case "\\archive": return "archive"
    default: return undefined
  }
}

function specialFromName(path: string): FolderSpecialUse | undefined {
  const value = normalize(path)
  if (value === "inbox") return "inbox"
  if (/(^|[/. ])(sent|sent items|wyslane)([/. ]|$)/.test(value)) return "sent"
  if (/(^|[/. ])(trash|deleted|kosz)([/. ]|$)/.test(value)) return "trash"
  if (/(^|[/. ])(spam|junk|niechciane)([/. ]|$)/.test(value)) return "spam"
  if (/(^|[/. ])(drafts|draft|robocze)([/. ]|$)/.test(value)) return "drafts"
  if (/(^|[/. ])(archive|archives|archiwum)([/. ]|$)/.test(value)) return "archive"
  return undefined
}

export function mapFolders(items: ListResponse[], config: MailboxConfig): MailFolder[] {
  const overrides = new Map<string, FolderSpecialUse>()
  if (config.folders?.sent) overrides.set(config.folders.sent, "sent")
  if (config.folders?.trash) overrides.set(config.folders.trash, "trash")
  if (config.folders?.spam) overrides.set(config.folders.spam, "spam")

  const order: Record<FolderSpecialUse, number> = {
    inbox: 0,
    sent: 1,
    trash: 2,
    spam: 3,
    drafts: 4,
    archive: 5,
  }

  return items
    .filter((item) => !item.flags.has("\\Noselect"))
    .map((item) => ({
      path: item.path,
      name: item.name || item.path,
      specialUse: overrides.get(item.path) ?? specialFromServer(item.specialUse) ?? specialFromName(item.path),
      total: item.status?.messages,
      unread: item.status?.unseen,
    }))
    .sort((a, b) => {
      const aOrder = a.specialUse ? order[a.specialUse] : 100
      const bOrder = b.specialUse ? order[b.specialUse] : 100
      return aOrder - bOrder || a.name.localeCompare(b.name, "pl")
    })
}

export function findSpecialFolder(folders: MailFolder[], specialUse: FolderSpecialUse): MailFolder | undefined {
  return folders.find((folder) => folder.specialUse === specialUse)
}
