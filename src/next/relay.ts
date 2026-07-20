import { createMailInlayHandler } from "./createMailInlayHandler"
import { assertRelaySecret, decryptMailboxConfig, verifyRelayAuthHeader } from "../server/relay-crypto"

export type MailInlayRelayInput = {
  /** Shared secret (>= 32 characters). The same value is configured in the panel-side proxy. */
  secret: string
}

export const RELAY_BOX_HEADER = "x-mailinlay-box"
export const RELAY_USER_HEADER = "x-mailinlay-user"

/**
 * Stateless relay for hosts that block outbound IMAP/SMTP ports. It stores no
 * mailbox data: every request carries the mailbox configuration encrypted with
 * the shared secret, which is decrypted only in memory for that request.
 */
export function createMailInlayRelay(input: MailInlayRelayInput) {
  assertRelaySecret(input.secret)

  return createMailInlayHandler({
    getSession: async (request) => {
      if (!verifyRelayAuthHeader(request.headers.get("authorization"), input.secret)) return null
      const forwardedUser = request.headers.get(RELAY_USER_HEADER)?.slice(0, 128) || "relay"
      return { userId: forwardedUser, projectId: "mailinlay-relay" }
    },
    getMailbox: async ({ mailboxId, request }) => {
      const blob = request.headers.get(RELAY_BOX_HEADER)
      if (!blob) return null
      const mailbox = decryptMailboxConfig(blob, input.secret)
      if (mailbox.id !== mailboxId) return null
      return mailbox
    },
  })
}
