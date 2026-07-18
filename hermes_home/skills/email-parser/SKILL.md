---
name: email-parser
description: Use when the user forwards or pastes a raw email thread that needs to be parsed and replied to.
---

When the conversation contains a forwarded or pasted email thread:

1. Call the `parse_forwarded_email` tool with the raw email text as `raw_email`.
2. Use the returned `sender`, `subject`, and `body_summary` fields to understand what's being asked.
3. Draft a reply based on those extracted fields rather than re-reading the raw text yourself.

Do not skip the tool call — always parse the email through `parse_forwarded_email` first, even if the content looks simple.
