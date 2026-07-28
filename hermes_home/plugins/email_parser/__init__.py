import logging
import os

from nylas import Client

from agent.plugin_llm import PluginLlmImageInput, PluginLlmTextInput
from tools.registry import tool_error, tool_result

from . import schemas

logger = logging.getLogger(__name__)

_ctx = None

MAX_ATTACHMENT_IMAGES = 5
MAX_ATTACHMENT_IMAGE_BYTES = 10 * 1024 * 1024  # 10 MB


def _format_recipients(entries) -> str:
    """Render a List[EmailName] (each a {"email": ..., "name": ...} dict) as
    'Name <email>, Name <email>'. EmailName is a TypedDict — a plain dict at
    runtime — so without this it would render as raw dict/list repr."""
    if not entries:
        return "(unknown)"
    parts = []
    for entry in entries:
        email = entry.get("email", "")
        name = entry.get("name")
        parts.append(f"{name} <{email}>" if name else email)
    return ", ".join(parts)


def _build_attachment_inputs(nylas, grant_id, message):
    """Split message.attachments into vision inputs + a text summary.

    complete_structured only understands text/image blocks, so images (up
    to MAX_ATTACHMENT_IMAGES, under the size cap) are downloaded and handed
    to the model as vision input. Everything else — non-image attachments,
    inline images (signature logos, tracking pixels), oversized or
    over-the-cap images — is only described by name/type/size so the model
    at least knows it exists.
    """
    image_inputs = []
    summary_lines = []

    for attachment in (message.attachments or []):
        if attachment.is_inline:
            continue

        content_type = attachment.content_type or "application/octet-stream"
        filename = attachment.filename or "(unnamed)"
        size = attachment.size or 0
        is_image = content_type.startswith("image/")

        if is_image and len(image_inputs) < MAX_ATTACHMENT_IMAGES and size <= MAX_ATTACHMENT_IMAGE_BYTES:
            try:
                data = nylas.attachments.download_bytes(
                    grant_id,
                    attachment.id,
                    query_params={"message_id": message.id},
                )
            except Exception as exc:
                logger.warning(
                    "parse_forwarded_email: failed to download attachment %s: %s",
                    attachment.id, exc,
                )
                summary_lines.append(f"- {filename} ({content_type}, {size} bytes) — could not be downloaded")
                continue

            image_inputs.append(
                PluginLlmImageInput(data=data, mime_type=content_type, file_name=filename)
            )
            summary_lines.append(f"- {filename} ({content_type}, {size} bytes) — shown below as an image")
        else:
            summary_lines.append(f"- {filename} ({content_type}, {size} bytes) — not analyzed")

    return image_inputs, summary_lines


def parse_forwarded_email(args: dict, **kwargs) -> str:
    if _ctx is None:
        return tool_error("Plugin context unavailable — parse_forwarded_email was not registered correctly")

    nylas = Client(
        os.environ["NYLAS_API_KEY"],
        "https://api.us.nylas.com"
    )

    grant_id = os.environ["NYLAS_GRANT_ID"]

    messages = nylas.messages.list(
        grant_id,
        query_params={
            "limit": 5,
            "unread": True
        }
    )

    replied = []
    errors = []

    for message in messages.data:
        image_inputs, attachment_summary = _build_attachment_inputs(nylas, grant_id, message)

        input_blocks = [
            PluginLlmTextInput(
                text=(
                    f"Subject: {message.subject}\n"
                    f"From: {_format_recipients(message.from_)}\n"
                    f"Body:\n{message.body}"
                )
            )
        ]
        if attachment_summary:
            input_blocks.append(
                PluginLlmTextInput(text="Attachments:\n" + "\n".join(attachment_summary))
            )
        input_blocks.extend(image_inputs)

        try:
            result = _ctx.llm.complete_structured(
                instructions=(
                    "You are drafting a reply to a forwarded email on behalf of the "
                    "mailbox owner. Read the subject, sender, and body, plus any "
                    "attachments provided — image attachments are shown to you "
                    "directly, other attachment types are only described by name "
                    "and MIME type since their contents aren't available to you. "
                    "Write a concise, professional reply that directly addresses "
                    "what the sender is asking for or reporting. If an image "
                    "attachment is relevant to the reply (e.g. a screenshot of an "
                    "error, a photo of a document), reference what you saw in it. "
                    "If a non-image attachment seems important but you can't read "
                    "it, acknowledge it in the reply instead of ignoring it. If "
                    "you can't tell what's being asked, draft a reply that "
                    "acknowledges receipt and asks a clarifying question rather "
                    "than guessing."
                ),
                input=input_blocks,
                json_schema=schemas.CREATE_REPLY_RESULT_SCHEMA,
                schema_name="create_reply_result",
                purpose="email_parser.parse_forwarded_email",
            )
        except Exception as exc:
            errors.append({"message_id": message.id, "error": f"LLM call failed: {exc}"})
            continue

        if result.parsed is None:
            errors.append({"message_id": message.id, "error": "LLM did not return valid structured output"})
            continue

        try:
            subject = result.parsed["subject"]
            body = result.parsed["body"]
            nylas.messages.send(
                grant_id,
                request_body={
                    "to": message.from_,
                    "cc": message.cc,
                    "bcc": message.bcc,
                    "reply_to_message_id": message.id,
                    "subject": subject,
                    "body": body
                }
            )
        except Exception as exc:
            errors.append({"message_id": message.id, "error": f"Failed to send reply: {exc}"})
            continue

        try:
            nylas.messages.update(grant_id, message.id, request_body={"unread": False})
        except Exception as exc:
            logger.warning(
                "parse_forwarded_email: replied to %s but failed to mark it read: %s",
                message.id, exc,
            )

        replied.append(message.id)

    if errors and not replied:
        return tool_error("Failed to reply to any forwarded emails", replied=replied, errors=errors)

    return tool_result(status="ok", replied=replied, errors=errors)


def register(ctx):
    global _ctx
    _ctx = ctx

    ctx.register_tool(
        name="parse_forwarded_email",
        toolset="email",
        schema=schemas.PARSE_FORWARDED_EMAIL,
        handler=parse_forwarded_email,
    )
