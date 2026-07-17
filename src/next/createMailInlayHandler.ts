import { z } from "zod"
import { errors, MailInlayError } from "../shared/errors"
import {
  attachmentIdSchema,
  listMessagesSchema,
  mailboxIdSchema,
  messageKeySchema,
  moveMessageSchema,
  updateMessageSchema,
} from "../shared/schemas"
import type { ErrorResponse, GetMailbox, GetSession, MailboxConfig } from "../shared/types"
import {
  deleteMessage,
  getAttachment,
  getFolders,
  getMessage,
  getMessages,
  moveMessage,
  updateMessage,
} from "../server/imap"
import { sendMessage } from "../server/smtp"

export type MailInlayRouteContext = {
  params:
    | { mailinlay?: string[] }
    | Promise<{ mailinlay?: string[] }>
}

type HandlerInput = {
  getSession: GetSession
  getMailbox: GetMailbox
}

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
}

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: NO_STORE_HEADERS })
}

function validateSameOrigin(request: Request) {
  const origin = request.headers.get("origin")
  if (!origin || origin !== new URL(request.url).origin) throw errors.forbiddenOrigin()
}

async function routeParts(context: MailInlayRouteContext): Promise<string[]> {
  const params = await context.params
  return params.mailinlay ?? []
}

function queryMailboxId(request: Request): string {
  return mailboxIdSchema.parse(new URL(request.url).searchParams.get("mailboxId") ?? "")
}

async function authorize(request: Request, input: HandlerInput): Promise<MailboxConfig> {
  const session = await input.getSession(request)
  if (!session) throw errors.unauthorized()
  const mailboxId = queryMailboxId(request)
  const mailbox = await input.getMailbox({ mailboxId, session })
  if (!mailbox) throw errors.mailboxNotFound()
  return mailbox
}

function safeFilename(value: string): string {
  return value.replace(/[\r\n]/g, "").replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_").slice(0, 180) || "attachment"
}

function attachmentDisposition(filename: string): string {
  return `attachment; filename="${safeFilename(filename)}"; filename*=UTF-8''${encodeURIComponent(filename.replace(/[\r\n]/g, ""))}`
}

function handleError(error: unknown): Response {
  const normalized = error instanceof MailInlayError
    ? error
    : error instanceof z.ZodError
      ? errors.invalidRequest()
      : errors.mailServer()

  if (!(error instanceof MailInlayError) && !(error instanceof z.ZodError)) {
    console.error(`[MailInlay] ${normalized.code}`)
  }

  const body: ErrorResponse = { error: { code: normalized.code, message: normalized.message } }
  return json(body, normalized.status)
}

export function createMailInlayHandler(input: HandlerInput) {
  const GET = async (request: Request, context: MailInlayRouteContext): Promise<Response> => {
    try {
      const parts = await routeParts(context)
      const mailbox = await authorize(request, input)
      const url = new URL(request.url)

      if (parts.length === 1 && parts[0] === "folders") {
        return json(await getFolders(mailbox))
      }

      if (parts.length === 1 && parts[0] === "messages") {
        const parsed = listMessagesSchema.parse({
          mailboxId: url.searchParams.get("mailboxId"),
          folder: url.searchParams.get("folder"),
          page: url.searchParams.get("page") ?? 1,
          limit: url.searchParams.get("limit") ?? 30,
          query: url.searchParams.get("query") ?? "",
        })
        return json(await getMessages(mailbox, parsed))
      }

      if (parts.length === 2 && parts[0] === "messages") {
        return json(await getMessage(mailbox, messageKeySchema.parse(parts[1])))
      }

      if (parts.length === 4 && parts[0] === "messages" && parts[2] === "attachments") {
        const attachment = await getAttachment(
          mailbox,
          messageKeySchema.parse(parts[1]),
          attachmentIdSchema.parse(parts[3]),
        )
        return new Response(new Uint8Array(attachment.content), {
          status: 200,
          headers: {
            ...NO_STORE_HEADERS,
            "Content-Type": attachment.contentType,
            "Content-Length": String(attachment.content.length),
            "Content-Disposition": attachmentDisposition(attachment.filename),
          },
        })
      }

      return json({ error: { code: "NOT_FOUND", message: "Endpoint nie istnieje." } }, 404)
    } catch (error) {
      return handleError(error)
    }
  }

  const POST = async (request: Request, context: MailInlayRouteContext): Promise<Response> => {
    try {
      validateSameOrigin(request)
      const parts = await routeParts(context)
      const mailbox = await authorize(request, input)

      if (parts.length === 1 && parts[0] === "send") {
        return json(await sendMessage(mailbox, await request.formData()))
      }

      if (parts.length === 3 && parts[0] === "messages" && parts[2] === "move") {
        const body = moveMessageSchema.parse(await request.json())
        return json(await moveMessage(mailbox, messageKeySchema.parse(parts[1]), body.destinationFolder))
      }

      return json({ error: { code: "NOT_FOUND", message: "Endpoint nie istnieje." } }, 404)
    } catch (error) {
      return handleError(error)
    }
  }

  const PATCH = async (request: Request, context: MailInlayRouteContext): Promise<Response> => {
    try {
      validateSameOrigin(request)
      const parts = await routeParts(context)
      const mailbox = await authorize(request, input)
      if (parts.length !== 2 || parts[0] !== "messages") {
        return json({ error: { code: "NOT_FOUND", message: "Endpoint nie istnieje." } }, 404)
      }
      const body = updateMessageSchema.parse(await request.json())
      return json(await updateMessage(mailbox, messageKeySchema.parse(parts[1]), body))
    } catch (error) {
      return handleError(error)
    }
  }

  const DELETE = async (request: Request, context: MailInlayRouteContext): Promise<Response> => {
    try {
      validateSameOrigin(request)
      const parts = await routeParts(context)
      const mailbox = await authorize(request, input)
      if (parts.length !== 2 || parts[0] !== "messages") {
        return json({ error: { code: "NOT_FOUND", message: "Endpoint nie istnieje." } }, 404)
      }
      return json(await deleteMessage(mailbox, messageKeySchema.parse(parts[1])))
    } catch (error) {
      return handleError(error)
    }
  }

  return { GET, POST, PATCH, DELETE }
}
