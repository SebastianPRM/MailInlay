import { z } from "zod"

export const mailboxIdSchema = z.string().trim().min(1).max(128)
export const folderPathSchema = z.string().min(1).max(1024)
export const messageKeySchema = z.string().min(1).max(2048)
export const attachmentIdSchema = z.coerce.number().int().min(0).max(1000)

export const listMessagesSchema = z.object({
  mailboxId: mailboxIdSchema,
  folder: folderPathSchema,
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
  query: z.string().trim().max(200).default(""),
})

export const updateMessageSchema = z
  .object({
    seen: z.boolean().optional(),
    flagged: z.boolean().optional(),
  })
  .refine((value) => value.seen !== undefined || value.flagged !== undefined)

export const moveMessageSchema = z.object({
  destinationFolder: folderPathSchema,
})

export const emailSchema = z.string().trim().email().max(320)
