# hand-postiz

A small fork of Postiz (upstream `v2.25.1`, branch `hand`) that adds a "By hand" channel type: a calendar and ledger slot for platforms you post to manually. The upstream README is unchanged.

## What and why

Some platforms have no usable posting API for you. This fork lets Postiz track them anyway, so planned and finished posts live in one calendar.

1. Channel type `manual` ("By hand"), with custom fields `platform`, `handle`, `profile_url`, `login_email`, `notes`. No passwords are stored.
2. Per-post settings: `liveUrl` (https URL of the real post) and `postedNote`.
3. For by-hand channels a "Channel card" replaces Rename. API: `GET/PUT /integrations/:id/manual-card`.
4. `post()` makes no network call.

## Rebuild and upgrade

1. Build the image: `deploy/build.sh` (optional `--tag`). Needs about 4 GB RAM.
2. Upgrade to a new upstream version, then rebuild:
   ```
   git fetch upstream --tags
   git checkout hand
   git rebase --onto vNEW v2.25.1 hand
   git push --force-with-lease origin hand
   ```
3. Deploy, backup and rollback steps: `deploy/README.md`.

## Verified behaviour (UI test, 2026-10-14)

1. Past dates are accepted in the composer and publish immediately.
2. A scheduled by-hand post flips to PUBLISHED at its time, with `releaseURL` = `liveUrl` (else `profile_url`), and makes no network call.
3. Preview-page comments (`/p/<id>?share=true`) survive publish. To record a late live URL, paste it there, or leave the post as a draft and edit it after posting.

## Known limitations

1. Postiz marks a by-hand post published without knowing whether a human posted it.
2. Upstream bugs seen: typing in the composer time-picker misbehaves; draft dates drift.

## License

AGPL-3.0, same as upstream. Private use is fine. If you ever expose this fork over a network to other users, you must offer them the corresponding source of this fork.
