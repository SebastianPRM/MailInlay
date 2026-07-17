# Changelog

All notable changes to MailInlay are recorded here.

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
