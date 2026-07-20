import { errors } from "../shared/errors"
import type { GetMailbox, GetSession } from "../shared/types"
import { assertRelaySecret, encryptMailboxConfig, relayAuthToken } from "../server/relay-crypto"
import {
  authorize,
  handleError,
  routeParts,
  validateSameOrigin,
  type MailInlayRouteContext,
} from "./createMailInlayHandler"
import { RELAY_BOX_HEADER, RELAY_USER_HEADER } from "./relay"

export type MailInlayProxyInput = {
  /** Absolute https URL of the relay route base, e.g. "https://my-relay.vercel.app/api/relay". */
  relayUrl: string
  /** Shared secret (>= 32 characters), identical to the relay's secret. */
  secret: string
  getSession: GetSession
  getMailbox: GetMailbox
  allowedOrigins?: string[]
}

const RELAY_TIMEOUT_MS = 55_000

const PASSTHROUGH_RESPONSE_HEADERS = ["content-type", "content-disposition", "content-length"]

function isAbortError(error: unknown): boolean {
  const name = (error as { name?: string } | null)?.name
  return name === "AbortError" || name === "TimeoutError"
}

/**
 * Panel-side handler that keeps authentication and mailbox credentials in the
 * host application and forwards mail operations to a MailInlay relay. The
 * mailbox configuration is sent per request, encrypted with the shared secret;
 * the relay never stores it.
 */
export function createMailInlayProxy(input: MailInlayProxyInput) {
  assertRelaySecret(input.secret)
  const relayBase = new URL(input.relayUrl)
  if (relayBase.protocol !== "https:" && relayBase.hostname !== "localhost") {
    throw new Error("MailInlay relayUrl must use https.")
  }
  const relayPath = relayBase.pathname.replace(/\/$/, "")
  const authToken = relayAuthToken(input.secret)

  const forward = async (request: Request, context: MailInlayRouteContext, mutating: boolean): Promise<Response> => {
    try {
      if (mutating) validateSameOrigin(request, input.allowedOrigins)
      const { mailbox, session } = await authorize(request, input)
      const parts = await routeParts(context)

      const target = new URL(`${relayPath}/${parts.map(encodeURIComponent).join("/")}`, relayBase.origin)
      new URL(request.url).searchParams.forEach((value, key) => target.searchParams.set(key, value))

      const headers = new Headers({
        authorization: `Bearer ${authToken}`,
        [RELAY_BOX_HEADER]: encryptMailboxConfig(mailbox, input.secret),
        [RELAY_USER_HEADER]: session.userId.replace(/[^\x20-\x7E]/g, "_").slice(0, 128),
        origin: relayBase.origin,
      })
      const contentType = request.headers.get("content-type")
      if (contentType) headers.set("content-type", contentType)

      const body = request.method === "GET" ? undefined : new Uint8Array(await request.arrayBuffer())
      const relayResponse = await fetch(target, {
        method: request.method,
        headers,
        body,
        cache: "no-store",
        signal: AbortSignal.timeout(RELAY_TIMEOUT_MS),
      })

      const responseHeaders = new Headers({
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      })
      for (const name of PASSTHROUGH_RESPONSE_HEADERS) {
        const value = relayResponse.headers.get(name)
        if (value) responseHeaders.set(name, value)
      }
      return new Response(relayResponse.body, { status: relayResponse.status, headers: responseHeaders })
    } catch (error) {
      if (isAbortError(error)) return handleError(errors.timeout())
      return handleError(error)
    }
  }

  return {
    GET: (request: Request, context: MailInlayRouteContext) => forward(request, context, false),
    POST: (request: Request, context: MailInlayRouteContext) => forward(request, context, true),
    PATCH: (request: Request, context: MailInlayRouteContext) => forward(request, context, true),
    DELETE: (request: Request, context: MailInlayRouteContext) => forward(request, context, true),
  }
}
