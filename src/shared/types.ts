export type SessionContext = {
  userId: string
  projectId: string
}

export type MailboxConfig = {
  id: string
  email: string
  displayName?: string
  imap: {
    host: string
    port: number
    secure: boolean
    username: string
    password: string
  }
  smtp: {
    host: string
    port: number
    secure: boolean
    username: string
    password: string
  }
  signatureHtml?: string
  folders?: {
    sent?: string
    trash?: string
    spam?: string
  }
  saveToSent?: boolean
}

export type GetSession = (request: Request) => Promise<SessionContext | null>

export type GetMailbox = (input: {
  mailboxId: string
  session: SessionContext
}) => Promise<MailboxConfig | null>

export type EmailAddress = {
  name?: string
  address: string
}

export type FolderSpecialUse = "inbox" | "sent" | "trash" | "spam" | "drafts" | "archive"

export type MailFolder = {
  path: string
  name: string
  specialUse?: FolderSpecialUse
  total?: number
  unread?: number
}

export type MailboxPublicInfo = {
  id: string
  email: string
  displayName?: string
  storageUsedPercent?: number
}

export type MessageSummary = {
  messageKey: string
  from: EmailAddress[]
  subject: string
  date: string
  seen: boolean
  flagged: boolean
  hasAttachments: boolean
}

export type MessageAttachment = {
  attachmentId: string
  filename: string
  contentType: string
  size: number
  inline: boolean
  downloadable: boolean
  contentId?: string
}

export type MessageDetail = MessageSummary & {
  replyTo: EmailAddress[]
  to: EmailAddress[]
  cc: EmailAddress[]
  messageId?: string
  inReplyTo?: string
  references: string[]
  text?: string
  html?: string
  hasRemoteImages: boolean
  attachments: MessageAttachment[]
}

export type FoldersResponse = {
  mailbox: MailboxPublicInfo
  folders: MailFolder[]
}

export type MessagesResponse = {
  items: MessageSummary[]
  page: number
  limit: number
  hasMore: boolean
  total: number
}

export type SendResponse = {
  ok: true
  sent: true
  savedToSent: boolean | "skipped"
  warning?: "SENT_SAVE_FAILED" | "SENT_FOLDER_NOT_FOUND"
  messageId?: string
}

export type ErrorResponse = {
  error: {
    code: string
    message: string
  }
}
