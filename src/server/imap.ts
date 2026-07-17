import { ImapFlow, type FetchMessageObject, type MessageAddressObject, type MessageStructureObject } from "imapflow"
import { errors, MailInlayError } from "../shared/errors"
import type {
  EmailAddress,
  FoldersResponse,
  MailboxConfig,
  MessageDetail,
  MessagesResponse,
} from "../shared/types"
import { mapFolders, findSpecialFolder } from "./folders"
import { decodeMessageKey, encodeMessageKey, type MessageKeyPayload } from "./message-key"
import { MAX_DOWNLOAD_BYTES, MAX_MESSAGE_SOURCE_BYTES } from "./limits"
import { attachmentBuffer, mapPostalAddresses, parseMessageSource, parseReferences } from "./parser"
import { sanitizeIncomingHtml } from "./sanitizer"

function isTimeout(error: unknown): boolean {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code) : ""
  return ["ETIMEDOUT", "ESOCKETTIMEDOUT", "ETIMEOUT"].includes(code)
}

export function createImapClient(config: MailboxConfig): ImapFlow {
  return new ImapFlow({
    host: config.imap.host,
    port: config.imap.port,
    secure: config.imap.secure,
    doSTARTTLS: config.imap.secure ? undefined : true,
    auth: { user: config.imap.username, pass: config.imap.password },
    disableAutoIdle: true,
    logger: false,
    connectionTimeout: 8_000,
    greetingTimeout: 8_000,
    socketTimeout: 25_000,
    maxLiteralSize: MAX_MESSAGE_SOURCE_BYTES + 1024,
    maxLineLength: 1024 * 1024,
    tls: { rejectUnauthorized: true, servername: config.imap.host },
  })
}

export async function withImap<T>(config: MailboxConfig, operation: (client: ImapFlow) => Promise<T>): Promise<T> {
  const client = createImapClient(config)
  try {
    await client.connect()
    return await operation(client)
  } catch (error) {
    if (error instanceof MailInlayError) throw error
    if (isTimeout(error)) throw errors.timeout()
    throw errors.mailServer()
  } finally {
    if (client.usable) await client.logout().catch(() => client.close())
    else client.close()
  }
}

function addressList(addresses?: MessageAddressObject[]): EmailAddress[] {
  return (addresses ?? [])
    .filter((address): address is MessageAddressObject & { address: string } => Boolean(address.address))
    .map((address) => ({ name: address.name || undefined, address: address.address }))
}

function structureHasAttachment(node?: MessageStructureObject): boolean {
  if (!node) return false
  if (node.disposition?.toLowerCase() === "attachment") return true
  if (node.dispositionParameters?.filename || node.parameters?.name) return true
  return node.childNodes?.some(structureHasAttachment) ?? false
}

async function listedFolders(client: ImapFlow, config: MailboxConfig) {
  const options = {
    statusQuery: { messages: true, unseen: true },
    specialUseHints: {
      sent: config.folders?.sent,
      trash: config.folders?.trash,
      junk: config.folders?.spam,
    },
  }
  try {
    return await client.list(options)
  } catch {
    return client.list({ specialUseHints: options.specialUseHints })
  }
}

export async function getFolders(config: MailboxConfig): Promise<FoldersResponse> {
  return withImap(config, async (client) => {
    const folders = mapFolders(await listedFolders(client, config), config)
    const quota = await client.getQuota().catch((): false => false)
    const storageUsed = quota !== false && quota.storage ? Number(quota.storage.used) : Number.NaN
    const storageLimit = quota !== false && quota.storage ? Number(quota.storage.limit) : Number.NaN
    const storageUsedPercent = Number.isFinite(storageUsed) && Number.isFinite(storageLimit) && storageLimit > 0
      ? Math.min(100, Math.round((storageUsed / storageLimit) * 100))
      : undefined

    return {
      mailbox: { id: config.id, email: config.email, displayName: config.displayName, storageUsedPercent },
      folders,
    }
  })
}

function summaryFromFetch(message: FetchMessageObject, folder: string, uidValidity: bigint) {
  return {
    messageKey: encodeMessageKey({ folder, uidValidity: uidValidity.toString(), uid: message.uid }),
    from: addressList(message.envelope?.from),
    subject: message.envelope?.subject?.trim() || "(bez tematu)",
    date: new Date(message.envelope?.date ?? message.internalDate ?? Date.now()).toISOString(),
    seen: message.flags?.has("\\Seen") ?? false,
    flagged: message.flags?.has("\\Flagged") ?? false,
    hasAttachments: structureHasAttachment(message.bodyStructure),
  }
}

export async function getMessages(
  config: MailboxConfig,
  input: { folder: string; page: number; limit: number; query: string },
): Promise<MessagesResponse> {
  return withImap(config, async (client) => {
    const lock = await client.getMailboxLock(input.folder, { readOnly: true, description: "mailinlay:list" }).catch(() => {
      throw errors.folderNotFound()
    })
    try {
      if (!client.mailbox) throw errors.folderNotFound()
      const mailbox = client.mailbox
      let total = mailbox.exists
      let hasMore = false
      let fetched: FetchMessageObject[] = []
      const query = input.query.trim()

      if (query) {
        const found = await client.search({
          or: [{ from: query }, { to: query }, { cc: query }, { subject: query }],
        }, { uid: true })
        const uids = (found || []).sort((a, b) => b - a)
        total = uids.length
        const start = (input.page - 1) * input.limit
        const pageUids = uids.slice(start, start + input.limit)
        hasMore = start + pageUids.length < total
        if (pageUids.length) {
          fetched = await client.fetchAll(pageUids, {
            uid: true, envelope: true, flags: true, bodyStructure: true, internalDate: true,
          }, { uid: true })
        }
      } else if (total > 0) {
        const end = total - (input.page - 1) * input.limit
        if (end > 0) {
          const start = Math.max(1, end - input.limit + 1)
          fetched = await client.fetchAll(`${start}:${end}`, {
            uid: true, envelope: true, flags: true, bodyStructure: true, internalDate: true,
          })
          hasMore = start > 1
        }
      }

      const items = fetched
        .sort((a, b) => b.uid - a.uid)
        .map((message) => summaryFromFetch(message, input.folder, mailbox.uidValidity))

      return { items, page: input.page, limit: input.limit, hasMore, total }
    } finally {
      lock.release()
    }
  })
}

async function validateOpenMessage(client: ImapFlow, key: MessageKeyPayload, readOnly: boolean) {
  const lock = await client.getMailboxLock(key.folder, { readOnly, description: "mailinlay:message" }).catch(() => {
    throw errors.messageNotFound()
  })
  if (!client.mailbox || client.mailbox.uidValidity.toString() !== key.uidValidity) {
    lock.release()
    throw errors.messageNotFound()
  }
  return lock
}

async function fetchParsedMessage(client: ImapFlow, key: MessageKeyPayload) {
  const meta = await client.fetchOne(key.uid, {
    uid: true, size: true, envelope: true, flags: true, bodyStructure: true, internalDate: true,
  }, { uid: true })
  if (!meta) throw errors.messageNotFound()
  if ((meta.size ?? 0) > MAX_MESSAGE_SOURCE_BYTES) {
    throw errors.tooLarge("Ta wiadomość jest za duża do otwarcia w tej instalacji.")
  }

  const full = await client.fetchOne(key.uid, {
    source: { maxLength: MAX_MESSAGE_SOURCE_BYTES + 1 },
  }, { uid: true })
  if (!full || !full.source) throw errors.messageNotFound()
  if (full.source.length > MAX_MESSAGE_SOURCE_BYTES) {
    throw errors.tooLarge("Ta wiadomość jest za duża do otwarcia w tej instalacji.")
  }

  return { meta, parsed: await parseMessageSource(full.source) }
}

export async function getMessage(config: MailboxConfig, messageKey: string): Promise<MessageDetail> {
  const key = decodeMessageKey(messageKey)
  return withImap(config, async (client) => {
    const lock = await validateOpenMessage(client, key, true)
    try {
      const { meta, parsed } = await fetchParsedMessage(client, key)
      const sanitized = parsed.html ? sanitizeIncomingHtml(parsed.html) : { html: undefined, hasRemoteImages: false }
      const attachments = parsed.attachments.map((attachment, index) => {
        const content = attachmentBuffer(attachment)
        return {
          attachmentId: String(index),
          filename: attachment.filename || `zalacznik-${index + 1}`,
          contentType: attachment.mimeType || "application/octet-stream",
          size: content.length,
          inline: attachment.disposition === "inline",
          downloadable: content.length <= MAX_DOWNLOAD_BYTES,
        }
      })

      return {
        ...summaryFromFetch(meta, key.folder, BigInt(key.uidValidity)),
        replyTo: mapPostalAddresses(parsed.replyTo),
        to: mapPostalAddresses(parsed.to),
        cc: mapPostalAddresses(parsed.cc),
        messageId: parsed.messageId || meta.envelope?.messageId,
        inReplyTo: parsed.inReplyTo || meta.envelope?.inReplyTo,
        references: parseReferences(parsed.references),
        text: parsed.text || undefined,
        html: sanitized.html,
        hasRemoteImages: sanitized.hasRemoteImages,
        attachments,
      }
    } finally {
      lock.release()
    }
  })
}

export async function getAttachment(config: MailboxConfig, messageKey: string, attachmentId: number) {
  const key = decodeMessageKey(messageKey)
  return withImap(config, async (client) => {
    const lock = await validateOpenMessage(client, key, true)
    try {
      const { parsed } = await fetchParsedMessage(client, key)
      const attachment = parsed.attachments[attachmentId]
      if (!attachment) throw errors.messageNotFound()
      const content = attachmentBuffer(attachment)
      if (content.length > MAX_DOWNLOAD_BYTES) {
        throw errors.tooLarge("Ten załącznik jest za duży do obsługi w tej instalacji.")
      }
      return {
        content,
        filename: attachment.filename || `zalacznik-${attachmentId + 1}`,
        contentType: attachment.mimeType || "application/octet-stream",
      }
    } finally {
      lock.release()
    }
  })
}

export async function updateMessage(
  config: MailboxConfig,
  messageKey: string,
  update: { seen?: boolean; flagged?: boolean },
) {
  const key = decodeMessageKey(messageKey)
  return withImap(config, async (client) => {
    const lock = await validateOpenMessage(client, key, false)
    try {
      if (update.seen !== undefined) {
        const method = update.seen ? client.messageFlagsAdd.bind(client) : client.messageFlagsRemove.bind(client)
        await method(key.uid, ["\\Seen"], { uid: true, silent: true })
      }
      if (update.flagged !== undefined) {
        const method = update.flagged ? client.messageFlagsAdd.bind(client) : client.messageFlagsRemove.bind(client)
        await method(key.uid, ["\\Flagged"], { uid: true, silent: true })
      }
      return { ok: true as const }
    } finally {
      lock.release()
    }
  })
}

export async function moveMessage(config: MailboxConfig, messageKey: string, destinationFolder: string) {
  const key = decodeMessageKey(messageKey)
  return withImap(config, async (client) => {
    const folders = mapFolders(await listedFolders(client, config), config)
    if (!folders.some((folder) => folder.path === destinationFolder)) throw errors.folderNotFound()
    const lock = await validateOpenMessage(client, key, false)
    try {
      const result = await client.messageMove(key.uid, destinationFolder, { uid: true })
      if (!result) throw errors.messageNotFound()
      return { ok: true as const }
    } finally {
      lock.release()
    }
  })
}

export async function deleteMessage(config: MailboxConfig, messageKey: string) {
  const key = decodeMessageKey(messageKey)
  return withImap(config, async (client) => {
    const folders = mapFolders(await listedFolders(client, config), config)
    const trash = findSpecialFolder(folders, "trash")
    if (!trash) throw errors.trashNotFound()
    if (trash.path !== key.folder) throw errors.permanentDeleteDenied()
    const lock = await validateOpenMessage(client, key, false)
    try {
      const deleted = await client.messageDelete(key.uid, { uid: true })
      if (!deleted) throw errors.messageNotFound()
      return { ok: true as const }
    } finally {
      lock.release()
    }
  })
}

export async function appendSentMessage(config: MailboxConfig, raw: Buffer) {
  return withImap(config, async (client) => {
    const folders = mapFolders(await listedFolders(client, config), config)
    const sent = findSpecialFolder(folders, "sent")
    if (!sent) return { saved: false as const, warning: "SENT_FOLDER_NOT_FOUND" as const }
    const result = await client.append(sent.path, raw, ["\\Seen"], new Date())
    if (!result) return { saved: false as const, warning: "SENT_SAVE_FAILED" as const }
    return { saved: true as const }
  })
}
