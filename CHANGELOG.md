# Changelog

All notable changes to MailInlay are recorded here.

## [0.3.0] - 2026-07-20

### Added

- stateless relay mode for hosts that block outbound mail ports:
  `createMailInlayProxy` (panel side) and `createMailInlayRelay` (relay side);
- per-request AES-256-GCM encryption of the mailbox configuration with an
  HKDF-derived bearer token for relay authentication;
- `request` is now passed to `getMailbox` alongside `mailboxId` and `session`;
- relay/proxy test suites, including an end-to-end forwarding test.

## [0.2.0] - 2026-07-20

### Added

- inline `cid:` images resolved through the protected attachment endpoint;
- server-side unread-only filter backed by IMAP `SEARCH UNSEEN`;
- per-session rate limit for sending (10 messages per minute);
- optional `allowedOrigins` handler option for reverse-proxy deployments;
- persistent "session expired" state with a retry action instead of repeated error toasts;
- immediate mailbox refresh when the browser tab becomes visible again;
- IMAP unit tests (pagination, `uidValidity` staleness, Trash-only permanent delete).

### Changed

- opening a folder no longer auto-opens the newest message, so unread state is preserved
  until the user actually reads a message (also on mobile);
- closing the composer with unsaved content now asks for confirmation (scrim, Escape,
  close button and "Odrzuć");
- unread counters in the folder sidebar update immediately after reading or marking unread;
- `savedToSent` reports `"skipped"` when the Sent copy is intentionally disabled;
- the IMAP Sent-copy append uses short timeouts so the send flow fits the route budget;
- `In-Reply-To` and `References` entries are limited to 998 characters;
- unexpected server errors are now logged with details (server-side only);
- the bundled demo session is additionally disabled in production builds.

### Removed

- unused v0 prototype components and mock mail data from the demo application.

## [0.1.0] - 2026-07-17

### Added

- embeddable React mailbox panel and isolated stylesheet;
- Next.js App Router catch-all handler;
- short-lived IMAP connections for folders, messages, search and attachments;
- seen, starred, move, Trash and protected permanent-delete operations;
- SMTP compose, CC, BCC, attachments, signatures and Sent-copy handling;
- Reply, Reply All and Forward flows;
- strict HTML sanitization and opt-in remote images;
- same-origin mutations, server-enforced sender and resource limits;
- responsive vertical and horizontal admin-panel demonstrations;
- automated tests, type checking, package build and dependency audit.

### Verified

- successful TLS connection to a real IMAP/SMTP account;
- inbound message and attachment retrieval;
- outbound SMTP delivery and IMAP Sent copy;
- successful reply retrieval through IMAP;
- clean package installation from a generated tarball.
