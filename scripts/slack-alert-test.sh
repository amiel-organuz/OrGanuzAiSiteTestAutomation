#!/usr/bin/env bash
# Local smoke test for the monitoring Slack alerting.
#
# Posts a clearly-marked TEST message to every configured Slack webhook, using
# the same payload shape .github/workflows/monitoring.yml sends on a real
# Govmap/Ofek failure. Webhook URLs are read from the gitignored .env (the
# project's sanctioned spot for local secrets) — they are never printed.
#
# Usage:  ./scripts/slack-alert-test.sh
# Reads:  SLACK_WEBHOOK_URL, SLACK_WEBHOOK_BOT_URL  (either/both, from .env)

set -euo pipefail
cd "$(dirname "$0")/.."

if [ -f .env ]; then
  set -a; . ./.env; set +a
fi

PAYLOAD='{"text":":rotating_light: [LOCAL TEST] Organuz Govmap/Ofek monitoring — Slack alert wiring works. This is a test, not a real outage. :white_check_mark:"}'

post() { # $1 = label, $2 = url
  if [ -z "${2:-}" ]; then echo "$1: not set — skipping."; return; fi
  code=$(curl -sS -o /tmp/slack_alert_test.$$ -w '%{http_code}' \
    -X POST "$2" -H 'content-type: application/json' --data "$PAYLOAD" || echo "000")
  echo "$1 -> HTTP $code, body: $(cat /tmp/slack_alert_test.$$ 2>/dev/null)"
  rm -f /tmp/slack_alert_test.$$
}

post SLACK_WEBHOOK_URL "${SLACK_WEBHOOK_URL:-}"
post SLACK_WEBHOOK_BOT_URL "${SLACK_WEBHOOK_BOT_URL:-}"

if [ -z "${SLACK_WEBHOOK_URL:-}" ] && [ -z "${SLACK_WEBHOOK_BOT_URL:-}" ]; then
  echo "No Slack webhook set in .env — add SLACK_WEBHOOK_URL and/or SLACK_WEBHOOK_BOT_URL." >&2
  exit 1
fi
