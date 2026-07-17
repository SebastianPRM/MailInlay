"use client"

import { useEffect, useState } from "react"
import {
  Archive,
  ArrowLeft,
  Download,
  FileSpreadsheet,
  FileText,
  Forward,
  ImageOff,
  Mail,
  MailOpen,
  MoreHorizontal,
  Paperclip,
  Reply,
  ReplyAll,
  Star,
  Trash2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { formatFullDate, initials } from "@/lib/mail-utils"
import type { Message } from "@/lib/mail-data"

export type ReplyMode = "reply" | "reply-all" | "forward"

type Props = {
  message: Message | null
  onToggleStar: (id: string) => void
  onDelete: (id: string) => void
  onArchive: (id: string) => void
  onMarkUnread: (id: string) => void
  onReply: (mode: ReplyMode, message: Message) => void
  onBack: () => void
  onNotify: (message: string) => void
}

const attachmentIcon = (type: string) => (type === "xlsx" ? FileSpreadsheet : FileText)

export function MessageReader({
  message,
  onToggleStar,
  onDelete,
  onArchive,
  onMarkUnread,
  onReply,
  onBack,
  onNotify,
}: Props) {
  const [showImages, setShowImages] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)

  useEffect(() => {
    setShowImages(false)
    setMoreOpen(false)
  }, [message?.id])

  if (!message) {
    return (
      <div className="message-reader-empty">
        <span>
          <Mail aria-hidden="true" />
        </span>
        <strong>Wybierz wiadomość</strong>
        <p>Podgląd pojawi się tutaj bez opuszczania bieżącego widoku.</p>
      </div>
    )
  }

  return (
    <article className="message-reader" aria-label={`Wiadomość: ${message.subject}`}>
      <header className="message-reader__toolbar">
        <div>
          <button type="button" onClick={onBack} aria-label="Wróć do listy" className="reader-back">
            <ArrowLeft aria-hidden="true" />
          </button>
          <button type="button" onClick={() => onArchive(message.id)} aria-label="Archiwizuj" title="Archiwizuj">
            <Archive aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(message.id)}
            aria-label="Przenieś do kosza"
            title="Przenieś do kosza"
          >
            <Trash2 aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onToggleStar(message.id)}
            aria-label={message.starred ? "Usuń gwiazdkę" : "Dodaj gwiazdkę"}
            title={message.starred ? "Usuń gwiazdkę" : "Dodaj gwiazdkę"}
          >
            <Star className={cn(message.starred && "is-starred")} aria-hidden="true" />
          </button>
        </div>

        <div className="reader-more">
          <button
            type="button"
            aria-label="Więcej opcji"
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen(!moreOpen)}
          >
            <MoreHorizontal aria-hidden="true" />
          </button>
          {moreOpen && (
            <div className="reader-more__menu">
              <button
                type="button"
                onClick={() => {
                  setMoreOpen(false)
                  onMarkUnread(message.id)
                }}
              >
                <MailOpen aria-hidden="true" />
                Oznacz jako nieprzeczytaną
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="message-reader__scroll">
        <div className="message-reader__content">
          <div className="message-reader__subject">
            <h2>{message.subject}</h2>
            <span>Odebrane</span>
          </div>

          <div className="message-sender">
            <span
              className="message-sender__avatar"
              style={{ backgroundColor: message.labelColor ?? "var(--primary)" }}
            >
              {initials(message.fromName)}
            </span>
            <div>
              <p>
                <strong>{message.fromName}</strong>
                <span>{`<${message.fromEmail}>`}</span>
              </p>
              <small>
                do: {message.to.join(", ")}
                {message.cc?.length ? ` · DW: ${message.cc.join(", ")}` : ""}
              </small>
            </div>
            <time dateTime={message.date}>{formatFullDate(message.date)}</time>
          </div>

          {!showImages && (
            <div className="blocked-images">
              <ImageOff aria-hidden="true" />
              <span>Zewnętrzne obrazy są zablokowane dla bezpieczeństwa.</span>
              <button type="button" onClick={() => setShowImages(true)}>
                Pokaż
              </button>
            </div>
          )}

          <div className="message-body">
            {message.body.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>

          {message.attachments?.length ? (
            <section className="attachments" aria-label="Załączniki">
              <header>
                <Paperclip aria-hidden="true" />
                <span>
                  {message.attachments.length} {message.attachments.length === 1 ? "załącznik" : "załączniki"}
                </span>
              </header>
              <div>
                {message.attachments.map((attachment) => {
                  const Icon = attachmentIcon(attachment.type)

                  return (
                    <div className="attachment-card" key={attachment.id}>
                      <span>
                        <Icon aria-hidden="true" />
                      </span>
                      <div>
                        <strong>{attachment.name}</strong>
                        <small>{attachment.size}</small>
                      </div>
                      <button
                        type="button"
                        aria-label={`Pobierz ${attachment.name}`}
                        onClick={() => onNotify(`Rozpoczęto pobieranie: ${attachment.name}`)}
                      >
                        <Download aria-hidden="true" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </section>
          ) : null}
        </div>
      </div>

      <footer className="message-reply-bar">
        <button type="button" onClick={() => onReply("reply", message)}>
          <Reply aria-hidden="true" />
          <span>Odpowiedz</span>
        </button>
        <button type="button" onClick={() => onReply("reply-all", message)}>
          <ReplyAll aria-hidden="true" />
          <span>Wszystkim</span>
        </button>
        <button type="button" onClick={() => onReply("forward", message)}>
          <Forward aria-hidden="true" />
          <span>Przekaż</span>
        </button>
      </footer>
    </article>
  )
}
