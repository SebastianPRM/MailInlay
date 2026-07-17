#!/bin/zsh

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
ROOT_DIR="${0:A:h:h}"
cd "$ROOT_DIR" || exit 1

exec npm run dev
