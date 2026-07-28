# STORY-T1 (manual): Telegram instant reply

**Story:** As a user, I want instant replies on Telegram so the chat feels natural.

**Why manual:** this tests the messaging *channel* itself — Telegram's webhook/polling delivery and the gateway's connection handling — not just agent logic. Automating a true send-and-receive round trip needs a second live Telegram account that can message the bot and read its reply (a userbot session, not just a Bot API token — bots can't message other bots). Out of scope for now; see `tests/agent/` for automated coverage of the agent's own behavior via the CLI harness, which exercises the same underlying model/tool logic without the channel.

## Preconditions

- `hermes` container is running (`./run_docker.sh status`).
- Telegram gateway is connected — check `docker logs hermes | grep -i "\[Telegram\] Connect"` shows a successful connection, or `curl http://localhost:9119/api/status` (after logging in) shows `"gateway_platforms": {"telegram": {"state": "connected"}}`.
- Your Telegram account is authorized — either in `TELEGRAM_ALLOWED_USERS` (`hermes_home/.env`) or approved via the Pairing flow (`/portal/pairing`).

## Steps

1. Open Telegram, go to the DM with the bot.
2. Start a stopwatch, then send a plain text message (e.g. "Hey, are you there?").
3. Watch for the reply.

## Pass criteria

- A reply arrives **within a few seconds** — this is a live gateway with a persistent connection, not a cold-start serverless webhook, so "instant" means low-single-digit seconds, not the 15-minute bar T2 uses for email.
- The reply reads as the assistant's actual persona (matches `hermes_home/SOUL.md`'s tone), not an error message or a generic "unauthorized" bounce.
- No duplicate replies, no silent drop.

## Fail indicators to note if it fails

- No reply at all within ~30s → check `docker logs hermes` for `[Telegram]` connection errors or `Unauthorized user` entries.
- Reply arrives but is clearly an error/exception dump → check `hermes_home/logs/errors.log`.
- Very slow (10s+) → check whether `model.default` (`~google/gemini-flash-latest`) changed to something slower, or whether the message triggered an unexpected `delegate_task` (see STORY-T4) — background delegation shouldn't block the immediate reply, but a misconfigured synchronous wait would.
