# Recommended GitHub settings

This repository is public for simple installation, but it is owner-maintained
and all rights are reserved. Use the following settings to preserve that model.

## Access

- Keep **SebastianPRM** as the only repository owner and maintainer.
- Do not add collaborators unless they genuinely need write access.
- Keep only the dedicated MailInlay deploy key under **Settings → Deploy keys**.
- Leave **Allow write access** enabled for that key while automated maintenance
  from the owner's computer is required.
- Rotate or remove the deploy key immediately if that computer is lost or
  compromised.

Public users may view or fork a public repository, but they cannot modify this
repository without write access. Pull requests do not change `main` until the
owner explicitly accepts them.

## Protect `main`

Under **Settings → Rules → Rulesets**, create an active branch ruleset named
`Protect main` targeting the default branch. Enable:

- Restrict deletions;
- Require linear history;
- Block force pushes.

Keep the repository administrator as a bypass actor so the sole owner does not
lock himself out. Once all future work uses pull requests, optionally require
the `verify` status check from GitHub Actions before merging.

Requiring an approving review is not recommended for a one-person repository:
GitHub does not allow an author to approve their own pull request.

## Security

Under **Settings → Security → Advanced Security**:

- confirm secret scanning is active;
- enable push protection;
- enable private vulnerability reporting;
- subscribe to security-alert notifications.

Never add `.env.local`, mailbox passwords, private keys or production mail data
to Git. The repository ignore rules already cover common environment files and
build artifacts.

## Actions and dependency updates

Under **Settings → Actions → General**:

- use read-only workflow permissions by default;
- do not allow Actions to create or approve pull requests;
- allow GitHub-authored actions used by the CI workflow.

Dependabot may create update branches and pull requests, but it cannot merge
them into `main`. Only the owner should review and merge safe updates after CI
passes. If no bot-created branches are desired, remove
`.github/dependabot.yml`.

## Repository features

Recommended for the first release:

- keep Issues enabled for bug reports;
- disable Wiki unless separate community documentation is planned;
- leave Discussions and Sponsorships disabled;
- enable **Automatically delete head branches** after pull requests merge;
- keep `main` as the default branch;
- add topics: `react`, `nextjs`, `email`, `imap`, `smtp`, `admin-panel`.
