# Security policy

## Supported versions

Only the latest tagged release is supported with security fixes.

| Version | Supported |
| --- | --- |
| 0.3.x | Yes |
| Earlier versions | No |

## Reporting a vulnerability

Do not disclose suspected vulnerabilities in a public issue. Use GitHub's
private vulnerability reporting for this repository. If that feature is not
available, contact the repository owner through the GitHub profile
[@SebastianPRM](https://github.com/SebastianPRM) without including credentials,
mail content or other sensitive data in a public message.

Include the affected version, reproduction steps, expected impact and a minimal
proof of concept. Reports will be acknowledged when reviewed by the owner.

## Production responsibilities

Applications embedding MailInlay must:

- authenticate every route through their existing admin session;
- restrict mailbox lookup to the project from that session;
- encrypt mailbox credentials at rest;
- decrypt credentials only inside server-side `getMailbox`;
- add application-level rate limiting and an appropriate CSP;
- keep credentials out of client props, public environment variables and logs;
- use the Node.js runtime with verified TLS certificates.

The local demo session is not a production authentication mechanism.
