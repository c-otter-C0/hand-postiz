# deploy

Local build and deploy notes for the hand-postiz fork (branch `hand`, based on upstream `v2.25.1`).
Needs about 4 GB RAM and a few GB of disk for the build.

## Build

```
deploy/build.sh                                  # -> localhost/hand-postiz:2.25.1-hand
deploy/build.sh --tag localhost/hand-postiz:foo  # custom tag
```

## Deploy

Back up first (names assume the default podman-compose project; adjust container and volume names to yours):

```
podman exec postiz-postgres pg_dump -U postiz-user postiz-db-local | gzip > ~/postiz-$(date +%F).sql.gz
podman volume export postiz_postiz-uploads -o ~/postiz-uploads-$(date +%F).tar
```

In your compose dir, change exactly one line in the `postiz` service:

```
-    image: ghcr.io/gitroomhq/postiz-app:v2.25.1
+    image: localhost/hand-postiz:2.25.1-hand
```

Then restart the stack and check health (allow 3-5 min; expect `307`):

```
curl -sI http://localhost:5000 | head -1
```

If compose tries to pull the localhost image, run `podman-compose up -d --no-build postiz` or drop `pull_policy`.

## Rollback

Put `image: ghcr.io/gitroomhq/postiz-app:v2.25.1` back, restart, health check. Same upstream version, so no DB migration either way.

## Rebase onto a new upstream version

```
git fetch upstream --tags
git checkout hand
git rebase --onto vNEW v2.25.1 hand
git push --force-with-lease origin hand
```

Then rebuild with `--tag localhost/hand-postiz:NEW-hand`, update the compose line, and update the base tag in the rebase command above.

## License

Postiz is AGPL-3.0. If this fork is ever exposed over a network, offer the source to its users.
