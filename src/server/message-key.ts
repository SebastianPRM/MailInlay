import { z } from "zod"
import { errors } from "../shared/errors"

const payloadSchema = z.object({
  folder: z.string().min(1).max(1024),
  uidValidity: z.string().regex(/^\d+$/),
  uid: z.number().int().positive(),
})

export type MessageKeyPayload = z.infer<typeof payloadSchema>

export function encodeMessageKey(payload: MessageKeyPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url")
}

export function decodeMessageKey(key: string): MessageKeyPayload {
  try {
    return payloadSchema.parse(JSON.parse(Buffer.from(key, "base64url").toString("utf8")))
  } catch {
    throw errors.messageNotFound()
  }
}
