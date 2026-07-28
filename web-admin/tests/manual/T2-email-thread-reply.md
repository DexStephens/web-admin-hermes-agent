# STORY-T2 (manual): Email forward-and-reply-in-thread

**Story:** As a user, I want to forward an email to the assistant and have it reply in the thread quickly.

**Why manual:** like T1, this tests the channel itself (IMAP polling, SMTP threading — In-Reply-To/References headers landing in the same thread), not just agent logic. Fully automating needs a dedicated test mailbox with programmatic send (SMTP) and poll (IMAP) — doable, but real setup work not undertaken here; see the plan's trade-off notes.

## Preconditions

- `hermes` container is running.
- Email gateway connected — `docker logs hermes | grep -i "\[Email\] Connected"` should show `Connected as <EMAIL_ADDRESS>` (currently `dsteptesting@gmail.com` per `hermes_home/.env`).
- `EMAIL_ALLOW_ALL_USERS=true` (already set) or your sending address is in `EMAIL_ALLOWED_USERS`.

## Steps

1. Find (or start) an existing email thread with at least one prior message — forwarding a thread, not a single fresh email, is the actual story.
2. Forward that thread to the agent's email address (`EMAIL_ADDRESS` in `hermes_home/.env`), with a brief instruction in your forward (e.g. "Can you summarize this and draft a reply?").
3. Note the send timestamp.
4. Wait for a reply, checking your inbox / the original thread.

## Pass criteria

- A reply arrives **in under 15 minutes** (the story's explicit bar — email is inbox-polled, not webhook-pushed, so this is intentionally more generous than T1).
- The reply lands **in the same thread** (same subject line / thread view in your mail client, not a new standalone email) — confirms `In-Reply-To`/`References` headers are set correctly.
- The reply content shows the agent actually parsed the forwarded thread's context (references specifics from the original messages), not a generic "I received your email" bounce.

## Fail indicators to note if it fails

- No reply after 15+ min → check `docker logs hermes | grep -i email` for IMAP polling errors or auth failures.
- Reply arrives but as a new thread instead of inline → likely a threading-header bug, check the email adapter's reply construction.
- Reply ignores the forwarded content → check whether the adapter correctly extracts quoted/forwarded text vs. just the new instruction line.
