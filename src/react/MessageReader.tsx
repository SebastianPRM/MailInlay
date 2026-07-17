"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Archive, ArrowLeft, Download, FileSpreadsheet, FileText, Forward, ImageOff, LoaderCircle,
  Mail, MailOpen, MoreHorizontal, Paperclip, Reply, ReplyAll, Star, Trash2,
} from "lucide-react"
import type { MessageAttachment, MessageDetail } from "../shared/types"
import { cn, displayAddress, formatBytes, formatFullDate, initials } from "./utils"

export type ReplyMode = "reply" | "reply-all" | "forward"

type Props = {
  message: MessageDetail | null
  loading: boolean
  folderLabel: string
  canArchive: boolean
  permanentDelete: boolean
  onToggleStar: (message: MessageDetail) => void
  onDelete: (message: MessageDetail) => void
  onArchive: (message: MessageDetail) => void
  onMarkUnread: (message: MessageDetail) => void
  onReply: (mode: ReplyMode, message: MessageDetail) => void
  onDownload: (message: MessageDetail, attachment: MessageAttachment) => Promise<void>
  onBack: () => void
}

function attachmentIcon(contentType: string) {
  return /spreadsheet|excel|csv/i.test(contentType) ? FileSpreadsheet : FileText
}

export function MessageReader(props: Props) {
  const [showImages, setShowImages] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [downloading, setDownloading] = useState<string | null>(null)

  useEffect(() => {
    setShowImages(false)
    setMoreOpen(false)
  }, [props.message?.messageKey])

  const html = useMemo(() => {
    if (!props.message?.html) return undefined
    return showImages ? props.message.html.replace(/\sdata-mi-src=/g, " src=") : props.message.html
  }, [props.message?.html, showImages])

  if (props.loading) {
    return <div className="message-reader-empty"><span><LoaderCircle className="animate-spin" /></span><strong>Pobieranie wiadomości…</strong></div>
  }

  if (!props.message) {
    return <div className="message-reader-empty"><span><Mail aria-hidden="true" /></span><strong>Wybierz wiadomość</strong><p>Treść zostanie pobrana dopiero po jej otwarciu.</p></div>
  }

  const message = props.message
  const sender = displayAddress(message.from)

  return (
    <article className="message-reader" aria-label={`Wiadomość: ${message.subject}`}>
      <header className="message-reader__toolbar">
        <div>
          <button type="button" onClick={props.onBack} aria-label="Wróć do listy" className="reader-back"><ArrowLeft aria-hidden="true" /></button>
          <button type="button" onClick={() => props.onArchive(message)} aria-label="Archiwizuj" title="Archiwizuj" disabled={!props.canArchive}><Archive aria-hidden="true" /></button>
          <button type="button" onClick={() => props.onDelete(message)} aria-label={props.permanentDelete ? "Usuń trwale" : "Przenieś do kosza"} title={props.permanentDelete ? "Usuń trwale" : "Przenieś do kosza"}><Trash2 aria-hidden="true" /></button>
          <button type="button" onClick={() => props.onToggleStar(message)} aria-label={message.flagged ? "Usuń gwiazdkę" : "Dodaj gwiazdkę"}><Star className={cn(message.flagged && "is-starred")} aria-hidden="true" /></button>
        </div>
        <div className="reader-more">
          <button type="button" aria-label="Więcej opcji" aria-expanded={moreOpen} onClick={() => setMoreOpen(!moreOpen)}><MoreHorizontal aria-hidden="true" /></button>
          {moreOpen && (
            <div className="reader-more__menu">
              <button type="button" onClick={() => { setMoreOpen(false); props.onMarkUnread(message) }}><MailOpen aria-hidden="true" />Oznacz jako nieprzeczytaną</button>
            </div>
          )}
        </div>
      </header>

      <div className="message-reader__scroll">
        <div className="message-reader__content">
          <div className="message-reader__subject"><h2>{message.subject}</h2><span>{props.folderLabel}</span></div>
          <div className="message-sender">
            <span className="message-sender__avatar">{initials(sender)}</span>
            <div>
              <p><strong>{sender}</strong><span>{message.from[0]?.address ? `<${message.from[0].address}>` : ""}</span></p>
              <small>do: {message.to.map((item) => item.address).join(", ") || "—"}{message.cc.length ? ` · DW: ${message.cc.map((item) => item.address).join(", ")}` : ""}</small>
            </div>
            <time dateTime={message.date}>{formatFullDate(message.date)}</time>
          </div>

          {message.hasRemoteImages && !showImages && (
            <div className="blocked-images"><ImageOff aria-hidden="true" /><span>Zewnętrzne obrazy są zablokowane dla bezpieczeństwa.</span><button type="button" onClick={() => setShowImages(true)}>Pokaż</button></div>
          )}

          <div className="message-body">
            {html ? <div className="message-html" dangerouslySetInnerHTML={{ __html: html }} /> : message.text?.split(/\n{2,}/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
          </div>

          {message.attachments.length > 0 && (
            <section className="attachments" aria-label="Załączniki">
              <header><Paperclip aria-hidden="true" /><span>{message.attachments.length} {message.attachments.length === 1 ? "załącznik" : "załączniki"}</span></header>
              <div>
                {message.attachments.map((attachment) => {
                  const Icon = attachmentIcon(attachment.contentType)
                  return (
                    <div className="attachment-card" key={attachment.attachmentId}>
                      <span><Icon aria-hidden="true" /></span>
                      <div><strong>{attachment.filename}</strong><small>{formatBytes(attachment.size)}{!attachment.downloadable ? " · za duży" : ""}</small></div>
                      <button
                        type="button"
                        aria-label={`Pobierz ${attachment.filename}`}
                        disabled={!attachment.downloadable || downloading === attachment.attachmentId}
                        onClick={async () => {
                          setDownloading(attachment.attachmentId)
                          try { await props.onDownload(message, attachment) } finally { setDownloading(null) }
                        }}
                      >
                        {downloading === attachment.attachmentId ? <LoaderCircle className="animate-spin" /> : <Download aria-hidden="true" />}
                      </button>
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      </div>

      <footer className="message-reply-bar">
        <button type="button" onClick={() => props.onReply("reply", message)}><Reply aria-hidden="true" /><span>Odpowiedz</span></button>
        <button type="button" onClick={() => props.onReply("reply-all", message)}><ReplyAll aria-hidden="true" /><span>Wszystkim</span></button>
        <button type="button" onClick={() => props.onReply("forward", message)}><Forward aria-hidden="true" /><span>Przekaż</span></button>
      </footer>
    </article>
  )
}
