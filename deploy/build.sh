#!/usr/bin/env bash
# Build the hand-postiz image with podman from the repo root.
# Usage: deploy/build.sh [--tag localhost/hand-postiz:2.25.1-hand]
set -euo pipefail

tag="localhost/hand-postiz:2.25.1-hand"
if [[ "${1:-}" == "--tag" ]]; then
  tag="${2:?--tag needs a value}"
elif [[ $# -gt 0 ]]; then
  echo "usage: $0 [--tag <image:tag>]" >&2
  exit 2
fi

cd "$(dirname "${BASH_SOURCE[0]}")/.."
podman build -f Dockerfile.dev -t "$tag" .
